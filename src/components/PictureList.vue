<template>
  <div class="picture-list">
    <a-list
      :grid="{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }"
      :data-source="dataList"
      :loading="loading"
    >
      <template #renderItem="{ item: picture }">
        <a-list-item style="padding: 0">
          <a-card hoverable @click="doClickPicture(picture)">
            <template #cover>
              <img
                :alt="picture.name"
                :src="picture.thumbnailUrl ?? picture.url"
                style="height: 180px; object-fit: cover"
              />
            </template>
            <a-card-meta :title="picture.name">
              <template #description>
                <a-flex>
                  <a-tag
                    v-if="canSeePublicStatusTag(picture) && picture.publishToPublic && picture.reviewStatus === 1"
                    color="blue"
                  >
                    公共图库中
                  </a-tag>
                  <a-tag
                    v-else-if="canSeePublicStatusTag(picture) && picture.publishToPublic && picture.reviewStatus === 0"
                    color="orange"
                  >
                    公开审核中
                  </a-tag>
                  <a-tag
                    v-else-if="canSeePublicStatusTag(picture) && picture.publishToPublic && picture.reviewStatus === 2"
                    color="red"
                  >
                    公开审核未通过
                  </a-tag>
                  <a-tag color="green">
                    {{ picture.category ?? '默认' }}
                  </a-tag>
                  <a-tag v-for="tag in picture.tags" :key="tag">
                    {{ tag }}
                  </a-tag>
                </a-flex>
              </template>
            </a-card-meta>
            <div v-if="showPublicThumbCount && !showOp" class="public-thumb-bar">
              <span class="public-thumb-count">
                <LikeFilled class="public-thumb-icon" />
                {{ getThumbCount(picture) }}
              </span>
            </div>
            <template v-if="showOp" #actions>
              <ShareAltOutlined @click="(e) => doShare(picture, e)" />
              <SearchOutlined v-if="showSearchOp" @click="(e) => doSearch(picture, e)" />
              <EditOutlined v-if="canEdit" @click="(e) => doEdit(picture, e)" />
              <DeleteOutlined v-if="canDelete" @click="(e) => doDelete(picture, e)" />
            </template>
          </a-card>
        </a-list-item>
      </template>
    </a-list>
    <ShareModal ref="shareModalRef" :link="shareLink" :expire-time="shareExpireTime" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DeleteOutlined,
  EditOutlined,
  LikeFilled,
  SearchOutlined,
  ShareAltOutlined,
} from '@ant-design/icons-vue'
import { createPictureShareUsingPost, deletePictureUsingPost } from '@/api/pictureController.ts'
import { message } from 'ant-design-vue'
import ShareModal from '@/components/ShareModal.vue'
import { isSameId, toIdString } from '@/utils/id'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'

interface Props {
  dataList?: API.PictureVO[]
  loading?: boolean
  showOp?: boolean
  canEdit?: boolean
  canDelete?: boolean
  showSearchOp?: boolean
  showPublicThumbCount?: boolean
  onReload?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  dataList: () => [],
  loading: false,
  showOp: false,
  canEdit: false,
  canDelete: false,
  showSearchOp: true,
  showPublicThumbCount: false,
})

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()

const doClickPicture = (picture: API.PictureVO) => {
  const pictureId = toIdString(picture.id)
  if (!pictureId) {
    message.error('图片 id 无效')
    return
  }
  router.push({
    path: `/picture/${pictureId}`,
    query: {
      from: route.fullPath,
    },
  })
}

const doSearch = (picture, e) => {
  e.stopPropagation()
  const pictureId = toIdString(picture.id)
  if (!pictureId) {
    message.error('图片 id 无效')
    return
  }
  router.push({
    path: '/search_picture',
    query: {
      pictureId,
    },
  })
}

const doEdit = (picture, e) => {
  e.stopPropagation()
  const pictureId = toIdString(picture.id)
  if (!pictureId) {
    message.error('图片 id 无效')
    return
  }
  router.push({
    path: '/add_picture',
    query: {
      id: pictureId,
      spaceId: picture.spaceId,
      from: route.fullPath,
    },
  })
}

const doDelete = async (picture, e) => {
  e.stopPropagation()
  const id = toIdString(picture.id)
  if (!id) {
    message.error('图片 id 无效')
    return
  }
  const res = await deletePictureUsingPost({ id })
  if (res.data.code === 200) {
    message.success('删除成功')
    props.onReload?.()
  } else {
    message.error('删除失败')
  }
}

const shareModalRef = ref()
const shareLink = ref<string>()
const shareExpireTime = ref<string>()

const formatExpireTime = (expireTime?: string) => {
  if (!expireTime) {
    return undefined
  }
  return new Date(expireTime).toLocaleString()
}

const doShare = async (picture, e) => {
  e.stopPropagation()
  const pictureId = toIdString(picture.id)
  if (!pictureId) {
    message.error('图片 id 无效')
    return
  }
  const res = await createPictureShareUsingPost({
    pictureId,
  })
  if (res.data.code !== 200 || !res.data.data?.sharePath) {
    message.error(res.data.message ?? '生成分享链接失败')
    return
  }
  shareLink.value = `${window.location.protocol}//${window.location.host}${res.data.data.sharePath}`
  shareExpireTime.value = formatExpireTime(res.data.data.expireTime)
  if (shareModalRef.value) {
    shareModalRef.value.openModal()
  }
}

const getThumbCount = (picture: API.PictureVO) => {
  return Number((picture as API.PictureVO & { thumbCount?: number }).thumbCount ?? 0)
}

const canSeePublicStatusTag = (picture: API.PictureVO) => {
  return isSameId(picture.userId, loginUserStore.loginUser?.id)
}
</script>

<style scoped>
.public-thumb-bar {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.public-thumb-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 64px;
  justify-content: center;
  padding: 4px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 999px;
  color: rgba(0, 0, 0, 0.85);
  background: #fff;
}

.public-thumb-icon {
  color: #000;
}
</style>
