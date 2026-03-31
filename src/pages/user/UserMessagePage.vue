<template>
  <div id="userMessagePage" class="page-shell">
    <a-card title="消息中心" :bordered="false">
      <a-tabs v-model:activeKey="activeTab" @change="onTabChange">
        <a-tab-pane key="interaction" tab="互动消息" />
        <a-tab-pane key="system" tab="系统通知" />
      </a-tabs>

      <div class="toolbar">
        <a-button type="link" @click="readAllCurrentTab" :disabled="loading || !messageList.length">
          全部标为已读
        </a-button>
      </div>

      <a-spin :spinning="loading">
        <a-empty v-if="!messageList.length" description="暂无消息" />
        <a-list v-else :data-source="messageList" item-layout="horizontal">
          <template #renderItem="{ item }">
            <a-list-item class="message-item" @click="onMessageClick(item)">
              <a-list-item-meta>
                <template #avatar>
                  <a-badge dot :offset="[-2, 30]" :status="item.messageState === 0 ? 'error' : 'default'">
                    <a-avatar :src="item.sender?.userAvatar">
                      {{ getSenderInitial(item) }}
                    </a-avatar>
                  </a-badge>
                </template>
                <template #title>
                  <div class="message-title-row">
                    <span class="message-title">{{ getTitle(item) }}</span>
                    <a-tag v-if="item.messageState === 0" color="processing">未读</a-tag>
                    <a-tag v-else>已处理</a-tag>
                  </div>
                </template>
                <template #description>
                  <div class="message-content">{{ item.content || '-' }}</div>
                  <div v-if="isInviteMessage(item)" class="message-actions">
                    <a-space>
                      <a-button
                        type="primary"
                        size="small"
                        :loading="inviteActionLoadingId === item.id && inviteActionType === 'accept'"
                        :disabled="item.messageState === 1"
                        @click.stop="handleInvite(item, true)"
                      >
                        同意
                      </a-button>
                      <a-button
                        size="small"
                        danger
                        :loading="inviteActionLoadingId === item.id && inviteActionType === 'reject'"
                        :disabled="item.messageState === 1"
                        @click.stop="handleInvite(item, false)"
                      >
                        拒绝
                      </a-button>
                    </a-space>
                  </div>
                  <div class="message-time">{{ formatTime(item.createTime) }}</div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>

      <div class="pagination-wrapper" v-if="total > 0">
        <a-pagination
          :current="current"
          :page-size="pageSize"
          :total="total"
          :show-size-changer="false"
          @change="onPageChange"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import {
  listMessageVoByPageUsingPost,
  readAllMessageUsingPost,
  readMessageUsingPost,
  type MessageVO,
} from '@/api/messageController'
import { respondSpaceInviteUsingPost } from '@/api/spaceUserController'

const router = useRouter()

const activeTab = ref<'interaction' | 'system'>('interaction')
const loading = ref(false)
const inviteActionLoadingId = ref<number | string | undefined>()
const inviteActionType = ref<'accept' | 'reject' | undefined>()

const current = ref(1)
const pageSize = ref(10)
const total = ref(0)
const messageList = ref<MessageVO[]>([])

const interactionTypeList = ['like', 'favor', 'comment']
const systemTypeList = ['system', 'spaceInvite']

const currentQuery = computed(() => {
  if (activeTab.value === 'interaction') {
    return {
      current: current.value,
      pageSize: pageSize.value,
      messageTypeList: interactionTypeList,
    }
  }
  return {
    current: current.value,
    pageSize: pageSize.value,
    messageTypeList: systemTypeList,
  }
})

const fetchMessageList = async () => {
  loading.value = true
  try {
    const res = await listMessageVoByPageUsingPost(currentQuery.value)
    if (res.data.code === 200 && res.data.data) {
      messageList.value = res.data.data.records ?? []
      total.value = res.data.data.total ?? 0
      return
    }
    message.error(res.data.message || '获取消息失败')
  } finally {
    loading.value = false
  }
}

const onTabChange = () => {
  current.value = 1
  fetchMessageList()
}

const onPageChange = (page: number) => {
  current.value = page
  fetchMessageList()
}

const readAllCurrentTab = async () => {
  const body =
    activeTab.value === 'interaction'
      ? { messageTypeList: interactionTypeList }
      : { messageType: 'system' }
  const res = await readAllMessageUsingPost(body)
  if (res.data.code !== 200) {
    message.error(res.data.message || '标记失败')
    return
  }
  message.success('已全部标为已读')
  await fetchMessageList()
}

const isInviteMessage = (item: MessageVO) => item.messageType === 'spaceInvite'

const onMessageClick = async (item: MessageVO) => {
  if (isInviteMessage(item)) {
    return
  }
  if (item.id && item.messageState === 0) {
    await readMessageUsingPost({ id: item.id })
    item.messageState = 1
  }
  if (item.pictureId) {
    await router.push(`/picture/${item.pictureId}`)
  }
}

const handleInvite = async (item: MessageVO, accept: boolean) => {
  if (!item.id) {
    return
  }
  inviteActionLoadingId.value = item.id
  inviteActionType.value = accept ? 'accept' : 'reject'
  try {
    const res = await respondSpaceInviteUsingPost({
      messageId: item.id,
      accept,
    })
    if (res.data.code !== 200) {
      message.error(res.data.message || '处理邀请失败')
      return
    }
    item.messageState = 1
    item.content = accept
      ? '你已同意该空间邀请，现已加入对应团队空间。'
      : '你已拒绝该空间邀请。'
    if (accept) {
      window.dispatchEvent(new CustomEvent('team-space-updated'))
    }
    message.success(accept ? '已同意邀请' : '已拒绝邀请')
    await fetchMessageList()
  } finally {
    inviteActionLoadingId.value = undefined
    inviteActionType.value = undefined
  }
}

const getSenderInitial = (item: MessageVO) => {
  const name = item.sender?.userName || '系'
  return name.slice(0, 1)
}

const getTitle = (item: MessageVO) => {
  if (item.messageType === 'like') {
    return `${item.sender?.userName || '有用户'} 点赞了你的图片`
  }
  if (item.messageType === 'favor') {
    return `${item.sender?.userName || '有用户'} 收藏了你的图片`
  }
  if (item.messageType === 'comment') {
    if (item.content?.includes('评论收到了新回复')) {
      return `${item.sender?.userName || '有用户'} 回复了你的评论`
    }
    return `${item.sender?.userName || '有用户'} 评论了你的图片`
  }
  if (item.messageType === 'spaceInvite') {
    return `${item.sender?.userName || '空间管理员'} 邀请你加入团队空间`
  }
  return '系统通知'
}

const formatTime = (value?: string) => {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleString()
}

onMounted(() => {
  fetchMessageList()
})
</script>

<style scoped>
#userMessagePage {
  min-height: 0;
}

#userMessagePage :deep(.ant-card) {
  height: 100%;
}

#userMessagePage :deep(.ant-card-body) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

#userMessagePage :deep(.ant-spin-nested-loading),
#userMessagePage :deep(.ant-spin-container),
#userMessagePage :deep(.ant-list) {
  flex: 1;
  min-height: 0;
}

#userMessagePage :deep(.ant-list) {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.message-item {
  cursor: pointer;
}

.message-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-title {
  font-weight: 500;
}

.message-content {
  color: rgba(0, 0, 0, 0.75);
  white-space: pre-wrap;
  word-break: break-word;
}

.message-actions {
  margin-top: 8px;
}

.message-time {
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
  font-size: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
