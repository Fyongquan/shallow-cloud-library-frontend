<template>
  <div id="addPicturePage">
    <h2 style="margin-bottom: 16px">
      {{ isEditMode ? '修改图片' : '创建图片' }}
    </h2>
    <a-typography-paragraph v-if="spaceId" type="secondary">
      保存至空间：<a :href="`/space/${spaceId}`" target="_blank">{{ spaceId }}</a>
    </a-typography-paragraph>
    <a-alert
      v-if="isEditMode && picture && !canEditCurrentPicture"
      type="warning"
      show-icon
      message="当前图片不支持编辑"
      description="公共图库中的图片仅管理员可以编辑或删除。"
      style="margin-bottom: 16px"
    />

    <a-tabs v-model:activeKey="uploadType">
      <a-tab-pane key="file" tab="文件上传">
        <PictureUpload :picture="picture" :spaceId="spaceId" :onSuccess="onSuccess" />
      </a-tab-pane>
      <a-tab-pane key="url" tab="URL 上传" force-render>
        <UrlPictureUpload :picture="picture" :spaceId="spaceId" :onSuccess="onSuccess" />
      </a-tab-pane>
    </a-tabs>

    <div v-if="!isEditMode || canEditCurrentPicture" class="ai-bar">
      <a-button type="primary" ghost :icon="h(BulbOutlined)" @click="doTextGenerate">
        AI 文生图
      </a-button>
    </div>
    <ImageTextGenerate
      ref="imageTextGenerateRef"
      :spaceId="spaceId"
      :onSuccess="onTextGenerateSuccess"
    />

    <div v-if="picture && canEditCurrentPicture" class="edit-bar">
      <a-space size="middle">
        <a-button :icon="h(EditOutlined)" @click="doEditPicture">编辑图片</a-button>
        <a-button type="primary" :icon="h(FullscreenOutlined)" @click="doImagePainting">
          AI 扩图
        </a-button>
      </a-space>
      <ImageCropper
        ref="imageCropperRef"
        :imageUrl="picture.url"
        :picture="picture"
        :spaceId="spaceId"
        :space="space"
        :onSuccess="onCropSuccess"
      />
      <ImageOutPainting
        ref="imageOutPaintingRef"
        :picture="picture"
        :spaceId="spaceId"
        :onSuccess="onImageOutPaintingSuccess"
      />
    </div>

    <a-form
      v-if="picture && canEditCurrentPicture"
      name="pictureForm"
      layout="vertical"
      :model="pictureForm"
      @finish="handleSubmit"
    >
      <a-form-item name="name" label="名称">
        <a-input v-model:value="pictureForm.name" placeholder="请输入名称" allow-clear />
      </a-form-item>
      <a-form-item name="introduction" label="简介">
        <a-textarea
          v-model:value="pictureForm.introduction"
          placeholder="请输入简介"
          :auto-size="{ minRows: 2, maxRows: 5 }"
          allow-clear
        />
      </a-form-item>
      <a-form-item name="category" label="分类">
        <a-auto-complete
          v-model:value="pictureForm.category"
          placeholder="请输入分类"
          :options="categoryOptions"
          allow-clear
        />
      </a-form-item>
      <a-form-item name="tags" label="标签">
        <a-select
          v-model:value="pictureForm.tags"
          mode="tags"
          placeholder="请输入标签"
          :options="tagOptions"
          allow-clear
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%">
          {{ isEditMode ? '保存修改' : '创建' }}
        </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import PictureUpload from '@/components/PictureUpload.vue'
import UrlPictureUpload from '@/components/UrlPictureUpload.vue'
import ImageCropper from '@/components/ImageCropper.vue'
import ImageOutPainting from '@/components/ImageOutPainting.vue'
import ImageTextGenerate from '@/components/ImageTextGenerate.vue'
import { computed, h, onMounted, reactive, ref, watchEffect } from 'vue'
import { message } from 'ant-design-vue'
import {
  editPictureUsingPost,
  getPictureVoByIdUsingGet,
  listPictureTagCategoryUsingGet,
} from '@/api/pictureController.ts'
import { useRoute, useRouter } from 'vue-router'
import { BulbOutlined, EditOutlined, FullscreenOutlined } from '@ant-design/icons-vue'
import { getSpaceVoByIdUsingGet } from '@/api/spaceController.ts'
import { SPACE_PERMISSION_ENUM } from '@/constants/space.ts'

const router = useRouter()
const route = useRoute()

const picture = ref<API.PictureVO>()
const pictureForm = reactive<API.PictureEditRequest>({})
const uploadType = ref<'file' | 'url'>('file')
const isEditMode = computed(() => Boolean(route.query?.id))
const spaceId = computed(() => route.query?.spaceId as string | undefined)

const canEditCurrentPicture = computed(() => {
  if (!isEditMode.value) {
    return true
  }
  return (picture.value?.permissionList ?? []).includes(SPACE_PERMISSION_ENUM.PICTURE_EDIT)
})

const onSuccess = (newPicture: API.PictureVO) => {
  picture.value = newPicture
  pictureForm.name = newPicture.name
}

const handleSubmit = async (values: API.PictureEditRequest) => {
  const pictureId = picture.value?.id
  if (!pictureId) {
    return
  }
  const res = await editPictureUsingPost({
    id: pictureId,
    spaceId: spaceId.value,
    ...values,
  })
  if (res.data.code === 200 && res.data.data) {
    message.success(isEditMode.value ? '修改成功' : '创建成功')
    await router.push({
      path: `/picture/${pictureId}`,
    })
  } else {
    message.error((isEditMode.value ? '修改失败：' : '创建失败：') + res.data.message)
  }
}

const categoryOptions = ref<{ value: string; label: string }[]>([])
const tagOptions = ref<{ value: string; label: string }[]>([])

const getTagCategoryOptions = async () => {
  const res = await listPictureTagCategoryUsingGet()
  if (res.data.code === 200 && res.data.data) {
    tagOptions.value = (res.data.data.tagList ?? []).map((data: string) => ({
      value: data,
      label: data,
    }))
    categoryOptions.value = (res.data.data.categoryList ?? []).map((data: string) => ({
      value: data,
      label: data,
    }))
  } else {
    message.error('获取标签分类列表失败：' + res.data.message)
  }
}

onMounted(() => {
  getTagCategoryOptions()
})

const getOldPicture = async () => {
  const id = route.query?.id
  if (!id) {
    return
  }
  const res = await getPictureVoByIdUsingGet({
    id,
  })
  if (res.data.code === 200 && res.data.data) {
    const data = res.data.data
    picture.value = data
    pictureForm.name = data.name
    pictureForm.introduction = data.introduction
    pictureForm.category = data.category
    pictureForm.tags = data.tags
  } else {
    message.error('获取图片信息失败：' + res.data.message)
  }
}

onMounted(() => {
  getOldPicture()
})

const imageCropperRef = ref()

const doEditPicture = async () => {
  imageCropperRef.value?.openModal()
}

const onCropSuccess = (newPicture: API.PictureVO) => {
  picture.value = newPicture
}

const imageOutPaintingRef = ref()

const doImagePainting = async () => {
  imageOutPaintingRef.value?.openModal()
}

const onImageOutPaintingSuccess = (newPicture: API.PictureVO) => {
  picture.value = newPicture
}

const imageTextGenerateRef = ref()

const doTextGenerate = async () => {
  imageTextGenerateRef.value?.openModal()
}

const onTextGenerateSuccess = (newPicture: API.PictureVO) => {
  picture.value = newPicture
  pictureForm.name = newPicture.name
}

const space = ref<API.SpaceVO>()

const fetchSpace = async () => {
  if (!spaceId.value) {
    return
  }
  const res = await getSpaceVoByIdUsingGet({
    id: spaceId.value,
  })
  if (res.data.code === 200 && res.data.data) {
    space.value = res.data.data
  }
}

watchEffect(() => {
  fetchSpace()
})
</script>

<style scoped>
#addPicturePage {
  max-width: 720px;
  margin: 0 auto;
}

#addPicturePage .edit-bar {
  text-align: center;
  margin: 16px 0;
}

#addPicturePage .ai-bar {
  text-align: center;
  margin: 16px 0;
}
</style>
