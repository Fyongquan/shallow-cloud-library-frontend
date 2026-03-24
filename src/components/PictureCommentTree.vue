<template>
  <div class="comment-node" :class="`comment-level-${depth}`">
    <div class="comment-main">
      <a-avatar :size="depth === 1 ? 42 : 34" :src="comment.user?.userAvatar" />
      <div class="comment-body">
        <div class="comment-author">{{ displayUserName }}</div>

        <div v-if="!isEditingCurrent" class="comment-content">
          <template v-if="comment.replyUserId && comment.replyUser?.userName">
            <a class="reply-prefix">@{{ comment.replyUser.userName }}</a>
            <span>：</span>
          </template>
          <span>{{ comment.content }}</span>
        </div>

        <div v-else class="comment-edit-box">
          <a-textarea
            :value="editingContent"
            :maxlength="500"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            @update:value="onEditContentChange"
          />
          <a-space>
            <a-button type="primary" size="small" :loading="savingEdit" @click="submitEdit">保存</a-button>
            <a-button size="small" @click="emit('edit-cancel')">取消</a-button>
          </a-space>
        </div>

        <div class="comment-actions-row">
          <span class="comment-time">{{ formatRelativeTime(comment.createTime) }}</span>
          <a-button
            v-if="hasChildren"
            type="link"
            size="small"
            class="toggle-replies"
            @click="toggleChildren"
          >
            {{ isExpanded ? '收起回复' : `查看回复 (${childCount})` }}
          </a-button>
          <a-button
            v-if="depth < maxDepth"
            shape="circle"
            size="small"
            class="action-icon"
            @click="startReply"
          >
            <template #icon>
              <MessageOutlined />
            </template>
          </a-button>
          <a-button
            shape="circle"
            size="small"
            class="action-icon"
            :loading="isThumbingCurrent"
            @click="emit('thumb-toggle', comment)"
          >
            <template #icon>
              <LikeFilled v-if="comment.thumbed" />
              <LikeOutlined v-else />
            </template>
          </a-button>
          <span class="comment-thumb-count">{{ comment.thumbCount ?? 0 }}</span>
          <a-button
            v-if="canEditComment(comment) && !isEditingCurrent"
            shape="circle"
            size="small"
            class="action-icon"
            @click="emit('edit-start', comment)"
          >
            <template #icon>
              <EditOutlined />
            </template>
          </a-button>
          <a-button
            v-if="canDeleteComment(comment)"
            shape="circle"
            size="small"
            class="action-icon"
            @click="emit('delete', comment)"
          >
            <template #icon>
              <DeleteOutlined />
            </template>
          </a-button>
        </div>

        <div v-if="isReplyingCurrent" class="reply-editor">
          <a-textarea
            :value="replyingContent"
            :maxlength="500"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            :placeholder="`回复 @${displayUserName}`"
            @update:value="onReplyContentChange"
          />
          <a-space>
            <a-button type="primary" size="small" :loading="submittingReply" @click="submitReply">发表回复</a-button>
            <a-button size="small" @click="emit('reply-cancel')">取消</a-button>
          </a-space>
        </div>

        <div v-if="hasChildren && isExpanded" class="comment-children">
          <PictureCommentTree
            v-for="child in comment.children"
            :key="child.id"
            :comment="child"
            :login-user="loginUser"
            :depth="depth + 1"
            :max-depth="maxDepth"
            :editing-comment-id="editingCommentId"
            :editing-content="editingContent"
            :saving-edit="savingEdit"
            :replying-comment-id="replyingCommentId"
            :replying-content="replyingContent"
            :submitting-reply="submittingReply"
            :thumbing-comment-id="thumbingCommentId"
            :expanded-ids="expandedIds"
            @reply-start="emit('reply-start', $event)"
            @reply-cancel="emit('reply-cancel')"
            @reply-content-change="emit('reply-content-change', $event)"
            @reply-submit="emit('reply-submit', $event)"
            @toggle-children="emit('toggle-children', $event)"
            @edit-start="emit('edit-start', $event)"
            @edit-cancel="emit('edit-cancel')"
            @edit-content-change="emit('edit-content-change', $event)"
            @edit-submit="emit('edit-submit', $event)"
            @delete="emit('delete', $event)"
            @thumb-toggle="emit('thumb-toggle', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DeleteOutlined, EditOutlined, LikeFilled, LikeOutlined, MessageOutlined } from '@ant-design/icons-vue'
import { isSameId, toIdString } from '@/utils/id'
import type { PictureCommentVO } from '@/api/pictureInteractController'

interface Props {
  comment: PictureCommentVO
  loginUser?: API.LoginUserVO
  depth?: number
  maxDepth?: number
  editingCommentId?: number | string
  editingContent?: string
  savingEdit?: boolean
  replyingCommentId?: number | string
  replyingContent?: string
  submittingReply?: boolean
  thumbingCommentId?: number | string
  expandedIds?: Array<number | string>
}

const props = withDefaults(defineProps<Props>(), {
  depth: 1,
  maxDepth: 3,
  editingCommentId: undefined,
  editingContent: '',
  savingEdit: false,
  replyingCommentId: undefined,
  replyingContent: '',
  submittingReply: false,
  thumbingCommentId: undefined,
  expandedIds: () => [],
})

const emit = defineEmits<{
  (e: 'reply-start', comment: PictureCommentVO): void
  (e: 'reply-cancel'): void
  (e: 'reply-content-change', content: string): void
  (e: 'reply-submit', payload: { parentId: number | string; replyUserId: number | string; content: string }): void
  (e: 'toggle-children', comment: PictureCommentVO): void
  (e: 'edit-start', comment: PictureCommentVO): void
  (e: 'edit-cancel'): void
  (e: 'edit-content-change', content: string): void
  (e: 'edit-submit', payload: { id: number | string; content: string }): void
  (e: 'delete', comment: PictureCommentVO): void
  (e: 'thumb-toggle', comment: PictureCommentVO): void
}>()

const isEditingCurrent = computed(() => {
  if (!props.comment.id || !props.editingCommentId) {
    return false
  }
  return isSameId(props.comment.id, props.editingCommentId)
})

const isReplyingCurrent = computed(() => {
  if (!props.comment.id || !props.replyingCommentId) {
    return false
  }
  return isSameId(props.comment.id, props.replyingCommentId)
})

const isThumbingCurrent = computed(() => {
  if (!props.comment.id || !props.thumbingCommentId) {
    return false
  }
  return isSameId(props.comment.id, props.thumbingCommentId)
})

const displayUserName = computed(() => {
  if (props.comment.user?.userName) {
    return props.comment.user.userName
  }
  return props.comment.userId ? `用户 ${props.comment.userId}` : '匿名'
})

const childCount = computed(() => props.comment.children?.length ?? 0)
const hasChildren = computed(() => childCount.value > 0)

const isExpanded = computed(() => {
  if (!props.comment.id) {
    return false
  }
  const currentId = toIdString(props.comment.id)
  if (!currentId) {
    return false
  }
  return props.expandedIds.some((id) => isSameId(id, currentId))
})

const toggleChildren = () => {
  emit('toggle-children', props.comment)
}

const startReply = () => {
  emit('reply-start', props.comment)
}

const canDeleteComment = (comment: PictureCommentVO) => {
  if (!props.loginUser?.id || !comment.userId) {
    return false
  }
  if (props.loginUser.userRole === 'admin') {
    return true
  }
  return isSameId(props.loginUser.id, comment.userId)
}

const canEditComment = (comment: PictureCommentVO) => {
  if (!props.loginUser?.id || !comment.userId) {
    return false
  }
  if (props.loginUser.userRole === 'admin') {
    return true
  }
  return isSameId(props.loginUser.id, comment.userId)
}

const onEditContentChange = (value: string) => {
  emit('edit-content-change', value)
}

const onReplyContentChange = (value: string) => {
  emit('reply-content-change', value)
}

const submitEdit = () => {
  const id = toIdString(props.comment.id)
  if (!id) {
    return
  }
  emit('edit-submit', {
    id,
    content: props.editingContent ?? '',
  })
}

const submitReply = () => {
  const parentId = toIdString(props.comment.id)
  const replyUserId = toIdString(props.comment.userId)
  if (!parentId || !replyUserId) {
    return
  }
  emit('reply-submit', {
    parentId,
    replyUserId,
    content: props.replyingContent ?? '',
  })
}

const formatRelativeTime = (value?: string) => {
  if (!value) {
    return ''
  }
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) {
    return ''
  }
  const diff = Date.now() - timestamp
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`
  }
  return new Date(value).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.comment-node {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.comment-body {
  flex: 1;
}

.comment-author {
  font-size: 20px;
  font-weight: 600;
  color: #1f1f1f;
  margin-bottom: 8px;
}

.comment-time {
  color: #a0a0a0;
  font-size: 12px;
}

.comment-content {
  white-space: pre-wrap;
  word-break: break-word;
  color: #222;
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 10px;
}

.reply-prefix {
  color: #1677ff;
  font-weight: 500;
}

.comment-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-thumb-count {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  min-width: 14px;
}

.toggle-replies {
  padding: 0;
}

.action-icon {
  border: none;
  box-shadow: none;
  color: rgba(0, 0, 0, 0.7);
  background: transparent;
}

.action-icon:hover {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.08);
}

.reply-editor,
.comment-edit-box {
  margin: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-children {
  margin-top: 12px;
  padding-left: 14px;
  border-left: 2px solid #f0f0f0;
}

.comment-level-1:last-child {
  border-bottom: none;
}
</style>
