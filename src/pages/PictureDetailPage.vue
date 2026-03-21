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
              下载图片
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
    <a-card title="互动" class="interaction-card" style="margin-top: 16px">
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
      <a-space direction="vertical" style="width: 100%" class="comment-editor-wrap">
        <a-textarea
          v-model:value="rootCommentContent"
          :maxlength="500"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          placeholder="写点评论吧（最多 500 字）"
        />
        <div class="comment-action-row">
          <a-button type="primary" :loading="commentSubmitting" @click="submitRootComment">
            发表评论
          </a-button>
        </div>
      </a-space>
      <a-divider />
      <a-spin :spinning="commentLoading">
        <a-empty
          v-if="!commentList.length"
          description="还没有评论，来写第一条吧"
        />
        <div v-else class="comment-tree-list">
          <PictureCommentTree
            v-for="item in commentList"
            :key="item.id"
            :comment="item"
            :login-user="loginUser"
            :editing-comment-id="editingCommentId"
            :editing-content="editingCommentContent"
            :saving-edit="commentEditing"
            :replying-comment-id="replyingCommentId"
            :replying-content="replyingContent"
            :submitting-reply="replySubmitting"
            :expanded-ids="expandedCommentIds"
            @reply-start="openReply"
            @reply-cancel="cancelReply"
            @reply-content-change="onReplyContentChange"
            @reply-submit="submitReplyComment"
            @toggle-children="toggleChildren"
            @edit-start="startEditComment"
            @edit-cancel="cancelEditComment"
            @edit-content-change="onEditContentChange"
            @edit-submit="submitEditComment"
            @delete="onDeleteComment"
          />
        </div>
      </a-spin>
      <div v-if="commentTotal > commentPageSize" class="comment-pagination">
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
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
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
  editPictureCommentUsingPost,
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
import PictureCommentTree from '@/components/PictureCommentTree.vue'
import { SPACE_PERMISSION_ENUM } from '@/constants/space.ts'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { storeToRefs } from 'pinia'
import { toIdString } from '@/utils/id'

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
      return
    }
    if (res.data.code === 200) {
      message.error('获取图片详情失败：未返回图片数据')
    }
  } catch (e: any) {
    console.error('获取图片详情失败', e)
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
  }
}

const doDownload = async () => {
  if (!picture.value.url) {
    message.error('图片地址无效')
    return
  }
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
  if (res.data.code !== 200) {
    return
  }
  if (!res.data.data?.sharePath) {
    message.error('生成分享链接失败：未返回分享链接')
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
const rootCommentContent = ref('')
const commentList = ref<PictureCommentVO[]>([])
const commentCurrent = ref(1)
const commentPageSize = ref(5)
const commentTotal = ref(0)
const commentPollingTimer = ref<number>()
const replyingCommentId = ref<number | string>()
const replyingContent = ref('')
const replySubmitting = ref(false)
const expandedCommentIds = ref<Array<number | string>>([])

const editingCommentId = ref<number | string>()
const editingCommentContent = ref('')
const commentEditing = ref(false)

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
      commentList.value = normalizeCommentRecords(res.data.data.records ?? [])
      commentTotal.value = res.data.data.total ?? 0
      commentCurrent.value = current
      syncCommentUiState()
      return
    }
  } finally {
    commentLoading.value = false
  }
}

const toTimestamp = (value?: string) => {
  if (!value) {
    return 0
  }
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const toNumericId = (id?: number | string) => {
  const idStr = toIdString(id)
  if (!idStr) {
    return 0
  }
  const value = Number(idStr)
  return Number.isNaN(value) ? 0 : value
}

const flattenCommentChildren = (children?: PictureCommentVO[]): PictureCommentVO[] => {
  if (!children?.length) {
    return []
  }
  const result: PictureCommentVO[] = []
  const walk = (nodes: PictureCommentVO[]) => {
    nodes.forEach((node) => {
      const flatNode: PictureCommentVO = {
        ...node,
        children: [],
      }
      result.push(flatNode)
      if (node.children?.length) {
        walk(node.children)
      }
    })
  }
  walk(children)
  return result.sort((a, b) => {
    const timeDiff = toTimestamp(a.createTime) - toTimestamp(b.createTime)
    if (timeDiff !== 0) {
      return timeDiff
    }
    return toNumericId(a.id) - toNumericId(b.id)
  })
}

const normalizeCommentRecords = (records: PictureCommentVO[]) => {
  return records.map((rootComment) => ({
    ...rootComment,
    children: flattenCommentChildren(rootComment.children),
  }))
}

const collectCommentIds = (nodes: PictureCommentVO[]) => {
  const result: string[] = []
  const walk = (list: PictureCommentVO[]) => {
    list.forEach((item) => {
      const id = toIdString(item.id)
      if (id) {
        result.push(id)
      }
      if (item.children?.length) {
        walk(item.children)
      }
    })
  }
  walk(nodes)
  return result
}

const syncCommentUiState = () => {
  const idSet = new Set(collectCommentIds(commentList.value))
  expandedCommentIds.value = expandedCommentIds.value
    .map((id) => toIdString(id))
    .filter((id): id is string => Boolean(id))
    .filter((id) => idSet.has(id))
  const currentReplyId = toIdString(replyingCommentId.value)
  if (currentReplyId && !idSet.has(currentReplyId)) {
    cancelReply()
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

const submitRootComment = async () => {
  if (!picture.value.id) {
    return
  }
  const safeContent = rootCommentContent.value.trim()
  if (!safeContent) {
    message.warning('请输入评论内容')
    return
  }
  commentSubmitting.value = true
  try {
    const res = await addPictureCommentUsingPost({
      pictureId: picture.value.id,
      content: safeContent,
    })
    if (res.data.code !== 200) {
      return
    }
    rootCommentContent.value = ''
    message.success('评论成功')
    await fetchInteractStatus()
    await fetchCommentList(1)
  } finally {
    commentSubmitting.value = false
  }
}

const openReply = (comment: PictureCommentVO) => {
  if (!comment.id || !comment.userId) {
    return
  }
  const commentId = toIdString(comment.id)
  if (!commentId) {
    return
  }
  if (replyingCommentId.value && toIdString(replyingCommentId.value) === commentId) {
    cancelReply()
    return
  }
  cancelEditComment()
  replyingCommentId.value = commentId
  replyingContent.value = ''
}

const onReplyContentChange = (content: string) => {
  replyingContent.value = content
}

const submitReplyComment = async (payload: {
  parentId: number | string
  replyUserId: number | string
  content: string
}) => {
  if (!picture.value.id) {
    return
  }
  const safeContent = payload.content.trim()
  if (!safeContent) {
    message.warning('请输入回复内容')
    return
  }
  replySubmitting.value = true
  try {
    const res = await addPictureCommentUsingPost({
      pictureId: picture.value.id,
      content: safeContent,
      parentId: payload.parentId,
      replyUserId: payload.replyUserId,
    })
    if (res.data.code !== 200) {
      return
    }
    const parentId = toIdString(payload.parentId)
    if (parentId && !expandedCommentIds.value.some((id) => toIdString(id) === parentId)) {
      expandedCommentIds.value.push(parentId)
    }
    cancelReply()
    message.success('回复成功')
    await fetchInteractStatus()
    await fetchCommentList(commentCurrent.value)
  } finally {
    replySubmitting.value = false
  }
}

const cancelReply = () => {
  replyingCommentId.value = undefined
  replyingContent.value = ''
}

const toggleChildren = (comment: PictureCommentVO) => {
  const id = toIdString(comment.id)
  if (!id) {
    return
  }
  const next = [...expandedCommentIds.value]
  const index = next.findIndex((item) => toIdString(item) === id)
  if (index >= 0) {
    next.splice(index, 1)
  } else {
    next.push(id)
  }
  expandedCommentIds.value = next
}

const startEditComment = (comment: PictureCommentVO) => {
  if (!comment.id) {
    return
  }
  cancelReply()
  editingCommentId.value = comment.id
  editingCommentContent.value = comment.content ?? ''
}

const cancelEditComment = () => {
  editingCommentId.value = undefined
  editingCommentContent.value = ''
}

const onEditContentChange = (content: string) => {
  editingCommentContent.value = content
}

const submitEditComment = async (payload: { id: number | string; content: string }) => {
  const safeContent = payload.content.trim()
  if (!safeContent) {
    message.warning('请输入评论内容')
    return
  }
  commentEditing.value = true
  try {
    const res = await editPictureCommentUsingPost({
      id: payload.id,
      content: safeContent,
    })
    if (res.data.code !== 200) {
      return
    }
    message.success('编辑评论成功')
    cancelEditComment()
    await fetchCommentList(commentCurrent.value)
  } finally {
    commentEditing.value = false
  }
}

const deleteComment = async (commentId?: number | string) => {
  if (!commentId) {
    return
  }
  const res = await deletePictureCommentUsingPost({ id: commentId })
  if (res.data.code !== 200) {
    return
  }
  message.success('删除评论成功')
  const maxPage = Math.max(1, Math.ceil((commentTotal.value - 1) / commentPageSize.value))
  await fetchInteractStatus()
  await fetchCommentList(Math.min(commentCurrent.value, maxPage))
}

const onDeleteComment = async (comment: PictureCommentVO) => {
  await deleteComment(comment.id)
}

const onCommentPageChange = (page: number) => {
  fetchCommentList(page)
}

const startCommentPolling = () => {
  stopCommentPolling()
  commentPollingTimer.value = window.setInterval(() => {
    fetchCommentList(commentCurrent.value)
  }, 5000)
}

const stopCommentPolling = () => {
  if (commentPollingTimer.value) {
    window.clearInterval(commentPollingTimer.value)
    commentPollingTimer.value = undefined
  }
}

onMounted(async () => {
  await fetchPictureDetail()
  await fetchInteractStatus()
  await fetchCommentList(1)
  startCommentPolling()
})

onUnmounted(() => {
  stopCommentPolling()
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

.comment-editor-wrap {
  padding: 4px 0;
}

.comment-tree-list {
  display: flex;
  flex-direction: column;
  padding: 0 4px;
}

.comment-pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

:deep(.interaction-card .ant-card-body) {
  padding-top: 12px;
}

:deep(.interaction-card .ant-divider-horizontal) {
  margin: 14px 0;
}
</style>
