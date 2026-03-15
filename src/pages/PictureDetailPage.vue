<template>
  <div id="pictureDetailPage">
    <a-row :gutter="[16, 16]">
      <a-col :sm="24" :md="16" :xl="18">
        <a-card title="图片预览">
          <a-image :src="picture.url" style="max-height: 600px; object-fit: contain" />
        </a-card>
      </a-col>
      <a-col :sm="24" :md="8" :xl="6">
        <a-card title="图片信息">
          <a-descriptions :column="1">
            <a-descriptions-item label="作者">
              <a-space>
                <a-avatar :size="24" :src="picture.user?.userAvatar" />
                <div>{{ picture.user?.userName }}</div>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="名称">
              {{ picture.name ?? '未命名' }}
            </a-descriptions-item>
            <a-descriptions-item label="简介">
              {{ picture.introduction ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="分类">
              {{ picture.category ?? '默认' }}
            </a-descriptions-item>
            <a-descriptions-item label="标签">
              <a-tag v-for="tag in picture.tags" :key="tag">
                {{ tag }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="格式">
              {{ picture.picFormat ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="宽度">
              {{ picture.picWidth ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="高度">
              {{ picture.picHeight ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="宽高比">
              {{ picture.picScale ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="大小">
              {{ formatSize(picture.picSize) }}
            </a-descriptions-item>
            <a-descriptions-item label="主色调">
              <a-space v-if="picture.picColor" :size="8" class="color-chip color-chip-main">
                <span
                  class="color-block color-block-main"
                  :style="{ backgroundColor: toHexColor(picture.picColor) }"
                />
                <span>{{ picture.picColor }}</span>
              </a-space>
              <template v-else>-</template>
            </a-descriptions-item>
            <a-descriptions-item label="代表色">
              <a-space wrap :size="[8, 8]">
                <template v-if="picture.picColorPalette?.length">
                  <div v-for="color in picture.picColorPalette" :key="color" class="color-chip">
                    <span class="color-block" :style="{ backgroundColor: toHexColor(color) }" />
                    <span>{{ color }}</span>
                  </div>
                </template>
                <template v-else>-</template>
              </a-space>
            </a-descriptions-item>
          </a-descriptions>
          <a-space wrap>
            <a-button type="primary" @click="doDownload">
              免费下载
              <template #icon>
                <DownloadOutlined />
              </template>
            </a-button>
            <a-button :icon="h(ShareAltOutlined)" type="primary" ghost @click="doShare">
              分享
            </a-button>
            <a-button v-if="canEdit" :icon="h(EditOutlined)" type="default" @click="doEdit">
              编辑
            </a-button>
            <a-button v-if="canDelete" :icon="h(DeleteOutlined)" danger @click="doDelete">
              删除
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
    <a-card title="互动" style="margin-top: 16px">
      <a-space wrap>
        <a-button :loading="thumbLoading" @click="toggleThumb">
          <template #icon>
            <LikeFilled v-if="interactStatus.thumbed" />
            <LikeOutlined v-else />
          </template>
          点赞 {{ interactStatus.thumbCount ?? 0 }}
        </a-button>
        <a-button :loading="favorLoading" @click="toggleFavor">
          <template #icon>
            <StarFilled v-if="interactStatus.favored" />
            <StarOutlined v-else />
          </template>
          收藏 {{ interactStatus.favorCount ?? 0 }}
        </a-button>
        <a-tag color="blue">
          <template #icon>
            <MessageOutlined />
          </template>
          评论 {{ interactStatus.commentCount ?? 0 }}
        </a-tag>
      </a-space>
      <a-divider />
      <a-space direction="vertical" style="width: 100%">
        <a-textarea
          v-model:value="commentContent"
          :maxlength="500"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          placeholder="写点评论吧（最多 500 字）"
        />
        <div class="comment-action-row">
          <a-button type="primary" :loading="commentSubmitting" @click="submitComment">
            发表评论
          </a-button>
        </div>
      </a-space>
      <a-divider />
      <a-list
        :data-source="commentList"
        :loading="commentLoading"
        item-layout="horizontal"
        :locale="{ emptyText: '还没有评论，来写第一条吧' }"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <template #actions>
              <a-button
                v-if="canDeleteComment(item)"
                type="link"
                danger
                size="small"
                @click="deleteComment(item.id)"
              >
                删除
              </a-button>
            </template>
            <a-list-item-meta>
              <template #avatar>
                <a-avatar :src="item.user?.userAvatar" />
              </template>
              <template #title>
                <a-space size="small">
                  <span>{{ item.user?.userName ?? `用户 ${item.userId}` }}</span>
                  <span class="comment-time">{{ formatCommentTime(item.createTime) }}</span>
                </a-space>
              </template>
              <template #description>
                <div class="comment-content">{{ item.content }}</div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
      <div class="comment-pagination">
        <a-pagination
          :current="commentCurrent"
          :page-size="commentPageSize"
          :total="commentTotal"
          :show-size-changer="false"
          @change="onCommentPageChange"
        />
      </div>
    </a-card>
    <ShareModal ref="shareModalRef" :link="shareLink" :expire-time="shareExpireTime" />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createPictureShareUsingPost,
  deletePictureUsingPost,
  getPictureVoByIdUsingGet,
} from '@/api/pictureController.ts'
import {
  addPictureCommentUsingPost,
  deletePictureCommentUsingPost,
  doPictureFavorUsingPost,
  doThumbUsingPost,
  getPictureInteractStatusUsingGet,
  listPictureCommentVoByPageUsingPost,
  type PictureCommentVO,
  type PictureInteractStatus,
  undoPictureFavorUsingPost,
  undoThumbUsingPost,
} from '@/api/pictureInteractController.ts'
import { message } from 'ant-design-vue'
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  LikeFilled,
  LikeOutlined,
  MessageOutlined,
  ShareAltOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons-vue'
import { downloadImage, formatSize, toHexColor } from '@/utils'
import ShareModal from '@/components/ShareModal.vue'
import { SPACE_PERMISSION_ENUM } from '@/constants/space.ts'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { storeToRefs } from 'pinia'
import { isSameId, toIdString } from '@/utils/id'

interface Props {
  id: string | number
}

const props = defineProps<Props>()
const picture = ref<API.PictureVO>({})
const route = useRoute()
const router = useRouter()

function createPermissionChecker(permission: string) {
  return computed(() => {
    return (picture.value.permissionList ?? []).includes(permission)
  })
}

const canEdit = createPermissionChecker(SPACE_PERMISSION_ENUM.PICTURE_EDIT)
const canDelete = createPermissionChecker(SPACE_PERMISSION_ENUM.PICTURE_DELETE)

const fetchPictureDetail = async () => {
  try {
    const pictureId = toIdString(props.id)
    if (!pictureId) {
      message.error('图片 id 无效')
      return
    }
    const res = await getPictureVoByIdUsingGet({
      id: pictureId as any,
      shareCode: route.query.shareCode as string | undefined,
    })
    if (res.data.code === 200 && res.data.data) {
      picture.value = res.data.data
    } else {
      message.error('获取图片详情失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('获取图片详情失败：' + e.message)
  }
}

const doEdit = () => {
  const pictureId = toIdString(picture.value.id)
  if (!pictureId) {
    message.error('图片 id 无效')
    return
  }
  router.push({
    path: '/add_picture',
    query: {
      id: pictureId,
      spaceId: toIdString(picture.value.spaceId),
      from: (route.query.from as string | undefined) ?? undefined,
    },
  })
}

const doDelete = async () => {
  const id = toIdString(picture.value.id)
  if (!id) {
    return
  }
  const res = await deletePictureUsingPost({ id: id as any })
  if (res.data.code === 200) {
    message.success('删除成功')
    const from = route.query.from as string | undefined
    if (from) {
      await router.push(from)
      return
    }
    if (picture.value.spaceId) {
      await router.push(`/space/${picture.value.spaceId}`)
      return
    }
    await router.push('/')
  } else {
    message.error('删除失败')
  }
}

const doDownload = () => {
  downloadImage(picture.value.url)
}

const shareModalRef = ref()
const shareLink = ref('')
const shareExpireTime = ref<string>()

const formatExpireTime = (expireTime?: string) => {
  if (!expireTime) {
    return undefined
  }
  return new Date(expireTime).toLocaleString()
}

const doShare = async () => {
  if (!picture.value.id) {
    return
  }
  const res = await createPictureShareUsingPost({
    pictureId: picture.value.id,
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

const loginUserStore = useLoginUserStore()
const { loginUser } = storeToRefs(loginUserStore)

const interactStatus = ref<PictureInteractStatus>({
  thumbCount: 0,
  thumbed: false,
  favorCount: 0,
  favored: false,
  commentCount: 0,
})
const thumbLoading = ref(false)
const favorLoading = ref(false)
const commentLoading = ref(false)
const commentSubmitting = ref(false)
const commentContent = ref('')
const commentList = ref<PictureCommentVO[]>([])
const commentCurrent = ref(1)
const commentPageSize = ref(10)
const commentTotal = ref(0)

const fetchInteractStatus = async () => {
  if (!picture.value.id) {
    return
  }
  const res = await getPictureInteractStatusUsingGet({
    pictureId: picture.value.id,
  })
  if (res.data.code === 200 && res.data.data) {
    interactStatus.value = {
      thumbCount: res.data.data.thumbCount ?? 0,
      thumbed: Boolean(res.data.data.thumbed),
      favorCount: res.data.data.favorCount ?? 0,
      favored: Boolean(res.data.data.favored),
      commentCount: res.data.data.commentCount ?? 0,
    }
  }
}

const fetchCommentList = async (current = 1) => {
  if (!picture.value.id) {
    return
  }
  commentLoading.value = true
  try {
    const res = await listPictureCommentVoByPageUsingPost({
      pictureId: picture.value.id,
      current,
      pageSize: commentPageSize.value,
    })
    if (res.data.code === 200 && res.data.data) {
      commentList.value = res.data.data.records ?? []
      commentTotal.value = res.data.data.total ?? 0
      commentCurrent.value = current
      interactStatus.value.commentCount = commentTotal.value
      return
    }
    message.error(res.data.message ?? '获取评论失败')
  } finally {
    commentLoading.value = false
  }
}

const toggleThumb = async () => {
  if (!picture.value.id) {
    return
  }
  thumbLoading.value = true
  try {
    if (interactStatus.value.thumbed) {
      await undoThumbUsingPost({ pictureId: picture.value.id })
    } else {
      await doThumbUsingPost({ pictureId: picture.value.id })
    }
    await fetchInteractStatus()
  } finally {
    thumbLoading.value = false
  }
}

const toggleFavor = async () => {
  if (!picture.value.id) {
    return
  }
  favorLoading.value = true
  try {
    if (interactStatus.value.favored) {
      await undoPictureFavorUsingPost({ pictureId: picture.value.id })
    } else {
      await doPictureFavorUsingPost({ pictureId: picture.value.id })
    }
    await fetchInteractStatus()
  } finally {
    favorLoading.value = false
  }
}

const submitComment = async () => {
  if (!picture.value.id) {
    return
  }
  if (!commentContent.value.trim()) {
    message.warning('请输入评论内容')
    return
  }
  commentSubmitting.value = true
  try {
    const res = await addPictureCommentUsingPost({
      pictureId: picture.value.id,
      content: commentContent.value.trim(),
    })
    if (res.data.code !== 200) {
      message.error(res.data.message ?? '发表评论失败')
      return
    }
    commentContent.value = ''
    message.success('评论成功')
    await fetchInteractStatus()
    await fetchCommentList(1)
  } finally {
    commentSubmitting.value = false
  }
}

const canDeleteComment = (comment: PictureCommentVO) => {
  if (!loginUser.value?.id || !comment.userId) {
    return false
  }
  if (loginUser.value.userRole === 'admin') {
    return true
  }
  return isSameId(loginUser.value.id, comment.userId)
}

const deleteComment = async (commentId?: number | string) => {
  if (!commentId) {
    return
  }
  const res = await deletePictureCommentUsingPost({ id: commentId })
  if (res.data.code !== 200) {
    message.error(res.data.message ?? '删除评论失败')
    return
  }
  message.success('删除评论成功')
  const maxPage = Math.max(1, Math.ceil((commentTotal.value - 1) / commentPageSize.value))
  await fetchInteractStatus()
  await fetchCommentList(Math.min(commentCurrent.value, maxPage))
}

const onCommentPageChange = (page: number) => {
  fetchCommentList(page)
}

const formatCommentTime = (value?: string) => {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleString()
}

onMounted(async () => {
  await fetchPictureDetail()
  await fetchInteractStatus()
  await fetchCommentList(1)
})
</script>

<style scoped>
#pictureDetailPage {
  margin-bottom: 16px;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border: 1px solid #f0f0f0;
  border-radius: 999px;
  background: #fafafa;
  line-height: 1;
}

.color-chip-main {
  padding: 6px 12px;
}

.color-block {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.color-block-main {
  width: 18px;
  height: 18px;
}

.comment-action-row {
  display: flex;
  justify-content: flex-end;
}

.comment-time {
  color: #999;
  font-size: 12px;
}

.comment-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
