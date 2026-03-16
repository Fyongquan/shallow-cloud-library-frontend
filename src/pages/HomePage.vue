<template>
  <div id="homePage">
    <div class="search-bar">
      <a-input-search
        v-model:value="searchParams.searchText"
        placeholder="从海量图片中搜索"
        enter-button="搜索"
        size="large"
        @search="doSearch"
      />
    </div>
    <div class="action-bar">
      <a-space>
        <a-checkbox
          v-model:checked="favorOnly"
          :disabled="!loginUserStore.loginUser.id"
          @change="doSearch"
        >
          仅看我的收藏
        </a-checkbox>
        <a-button
          v-if="loginUserStore.loginUser.id"
          type="primary"
          @click="router.push('/my_space?uploadToPublic=1')"
        >
          上传到公共图库
        </a-button>
      </a-space>
    </div>
    <a-tabs v-model:active-key="selectedCategory" @change="doSearch">
      <a-tab-pane key="all" tab="全部" />
      <a-tab-pane v-for="category in categoryList" :tab="category" :key="category" />
    </a-tabs>
    <div class="tag-bar">
      <span style="margin-right: 8px">标签：</span>
      <a-space :size="[0, 8]" wrap>
        <a-checkable-tag
          v-for="(tag, index) in tagList"
          :key="tag"
          v-model:checked="selectedTagList[index]"
          @change="doSearch"
        >
          {{ tag }}
        </a-checkable-tag>
      </a-space>
    </div>
    <PictureList :dataList="dataList" :loading="loading" showPublicThumbCount />
    <a-pagination
      style="text-align: right"
      v-model:current="searchParams.current"
      v-model:pageSize="searchParams.pageSize"
      :total="total"
      @change="onPageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import PictureList from '@/components/PictureList.vue'
import {
  listPictureTagCategoryUsingGet,
  listPictureVoByPageUsingPost,
} from '@/api/pictureController.ts'
import { getPictureInteractStatusUsingGet } from '@/api/pictureInteractController.ts'

type PublicPictureVO = API.PictureVO & {
  thumbCount?: number
}

const router = useRouter()
const loginUserStore = useLoginUserStore()
const dataList = ref<PublicPictureVO[]>([])
const total = ref(0)
const loading = ref(true)

const searchParams = reactive<API.PictureQueryRequest>({
  current: 1,
  pageSize: 12,
  sortField: 'createTime',
  sortOrder: 'descend',
})

const categoryList = ref<string[]>([])
const selectedCategory = ref<string>('all')
const tagList = ref<string[]>([])
const selectedTagList = ref<boolean[]>([])
const favorOnly = ref(false)

const fetchData = async () => {
  loading.value = true
  const params = {
    ...searchParams,
    tags: [] as string[],
  }
  if (selectedCategory.value !== 'all') {
    params.category = selectedCategory.value
  }
  selectedTagList.value.forEach((useTag, index) => {
    if (useTag) {
      params.tags.push(tagList.value[index])
    }
  })
  params.favorOnly = favorOnly.value && !!loginUserStore.loginUser.id
  const res = await listPictureVoByPageUsingPost(params)
  if (res.data.code === 200 && res.data.data) {
    const records = (res.data.data.records ?? []) as PublicPictureVO[]
    await fillThumbCount(records)
    dataList.value = records
    total.value = res.data.data.total ?? 0
  } else {
    message.error('获取数据失败：' + res.data.message)
  }
  loading.value = false
}

const fillThumbCount = async (records: PublicPictureVO[]) => {
  if (!records.length) {
    return
  }
  const tasks = records.map(async (picture) => {
    if (!picture.id) {
      return
    }
    try {
      const res = await getPictureInteractStatusUsingGet({
        pictureId: picture.id,
      } as any)
      if (res.data.code === 200) {
        picture.thumbCount = Number(res.data.data?.thumbCount ?? 0)
      }
    } catch {
      picture.thumbCount = 0
    }
  })
  await Promise.allSettled(tasks)
}

const onPageChange = (page: number, pageSize: number) => {
  searchParams.current = page
  searchParams.pageSize = pageSize
  fetchData()
}

const doSearch = () => {
  searchParams.current = 1
  fetchData()
}

const getTagCategoryOptions = async () => {
  const res = await listPictureTagCategoryUsingGet()
  if (res.data.code === 200 && res.data.data) {
    tagList.value = res.data.data.tagList ?? []
    categoryList.value = res.data.data.categoryList ?? []
  } else {
    message.error('获取标签分类列表失败：' + res.data.message)
  }
}

onMounted(() => {
  fetchData()
  getTagCategoryOptions()
})
</script>

<style scoped>
#homePage {
  margin-bottom: 16px;
}

#homePage .search-bar {
  max-width: 480px;
  margin: 0 auto 16px;
}

#homePage .action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

#homePage .tag-bar {
  margin-bottom: 16px;
}
</style>
