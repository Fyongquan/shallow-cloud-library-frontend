<template>
  <div id="userAiAssistantPage">
    <a-row :gutter="16">
      <a-col :xs="24" :lg="7">
        <a-card title="会话列表" :bordered="false">
          <template #extra>
            <a-button type="primary" size="small" @click="createNewSession">新建会话</a-button>
          </template>
          <a-spin :spinning="sessionLoading">
            <a-empty v-if="!sessionList.length" description="暂无会话" />
            <a-list v-else :data-source="sessionList" class="session-list">
              <template #renderItem="{ item }">
                <a-list-item
                  class="session-item"
                  :class="{ active: item.chatId === activeChatId }"
                  @click="switchSession(item.chatId)"
                >
                  <a-list-item-meta>
                    <template #title>
                      <div class="session-title-row">
                        <span class="session-title-text">
                          <PushpinOutlined v-if="item.isPinned === 1" class="session-pin-icon" />
                          {{ item.title || '新对话' }}
                        </span>
                        <div class="session-actions" @click.stop>
                          <a-tooltip :title="item.isPinned === 1 ? '取消置顶' : '置顶会话'">
                            <a-button type="text" size="small" @click.stop="togglePinSession(item)">
                              <PushpinOutlined :style="{ color: item.isPinned === 1 ? '#1677ff' : undefined }" />
                            </a-button>
                          </a-tooltip>
                          <a-tooltip title="重命名会话">
                            <a-button type="text" size="small" @click.stop="openRenameModal(item)">
                              <EditOutlined />
                            </a-button>
                          </a-tooltip>
                          <a-tooltip title="删除会话">
                            <a-button type="text" size="small" danger @click.stop="deleteSession(item)">
                              <DeleteOutlined />
                            </a-button>
                          </a-tooltip>
                        </div>
                      </div>
                    </template>
                    <template #description>
                      <div class="session-preview">{{ item.previewContent || '-' }}</div>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </a-spin>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="17">
        <a-card :title="activeSessionTitle" :bordered="false" class="chat-card">
          <a-spin :spinning="messageLoading">
            <div ref="messageContainerRef" class="message-container">
              <a-empty v-if="!messageList.length" description="开始和 AI 助手对话吧" />
              <template v-else>
                <div
                  v-for="item in messageList"
                  :key="item.id || `${item.roleType}-${item.createTime}-${item.content}`"
                  class="message-row"
                  :class="item.roleType === 'USER' ? 'message-user' : 'message-assistant'"
                >
                  <div class="message-bubble">{{ item.content }}</div>
                  <div class="message-time">{{ formatTime(item.createTime) }}</div>
                </div>
              </template>
            </div>
          </a-spin>
          <div class="input-wrapper">
            <a-textarea
              v-model:value="inputMessage"
              :auto-size="{ minRows: 2, maxRows: 4 }"
              :maxlength="2000"
              placeholder="请输入你的问题，按 Enter 发送，Shift+Enter 换行"
              @keydown="onKeydown"
            />
            <div class="input-actions">
              <a-button type="primary" :loading="sending" @click="sendMessage">发送</a-button>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
    <a-modal
      v-model:open="renameModalOpen"
      title="重命名会话"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="renameLoading"
      @ok="submitRenameSession"
    >
      <a-input
        v-model:value="renameTitle"
        :maxlength="40"
        placeholder="请输入会话标题"
        @keyup.enter="submitRenameSession"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { DeleteOutlined, EditOutlined, PushpinOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import {
  deleteAiChatSessionUsingPost,
  getAllUserChatHisUsingPost,
  getChatHisVoPageUsingPost,
  getNewChatIdUsingPost,
  pinAiChatSessionUsingPost,
  renameAiChatSessionUsingPost,
  type AiChatMessageVO,
  type AiChatSessionVO,
} from '@/api/userAiChatController'

const CHAT_TYPE = 'CS'

const sessionLoading = ref(false)
const messageLoading = ref(false)
const sending = ref(false)

const sessionList = ref<AiChatSessionVO[]>([])
const messageList = ref<AiChatMessageVO[]>([])
const activeChatId = ref('')
const inputMessage = ref('')
const messageContainerRef = ref<HTMLElement>()
const renameModalOpen = ref(false)
const renameLoading = ref(false)
const renameTitle = ref('')
const renameTargetChatId = ref('')
let activeEventSource: EventSource | null = null

const activeSessionTitle = computed(() => {
  const current = sessionList.value.find((item) => item.chatId === activeChatId.value)
  return current?.title || 'AI 助手'
})

const isSuccessCode = (code?: number) => code === 200

const closeActiveStream = () => {
  if (activeEventSource) {
    activeEventSource.close()
    activeEventSource = null
  }
}

const streamChatReply = (chatId: string, content: string) => {
  return new Promise<void>((resolve, reject) => {
    closeActiveStream()
    const params = new URLSearchParams({
      chatId,
      chatType: CHAT_TYPE,
      userMessage: content,
    })
    const sseUrl = `/api/userAIChat/chat/sse?${params.toString()}`
    const eventSource = new EventSource(sseUrl)
    activeEventSource = eventSource

    let completed = false
    const assistantMessage: AiChatMessageVO = {
      chatId,
      chatType: CHAT_TYPE,
      roleType: 'ASSISTANT',
      content: '',
      createTime: new Date().toISOString(),
    }
    messageList.value.push(assistantMessage)

    eventSource.addEventListener('message', (event: MessageEvent) => {
      const delta = `${event.data ?? ''}`
      assistantMessage.content = `${assistantMessage.content ?? ''}${delta}`
      scrollToBottom()
    })

    eventSource.addEventListener('done', () => {
      completed = true
      closeActiveStream()
      resolve()
    })

    eventSource.addEventListener('business-error', (event: MessageEvent) => {
      completed = true
      closeActiveStream()
      const errorMsg = `${event.data ?? 'AI 流式回复失败'}`.trim()
      assistantMessage.content = assistantMessage.content || `[错误] ${errorMsg}`
      reject(new Error(errorMsg))
    })

    eventSource.onerror = () => {
      if (completed) {
        return
      }
      closeActiveStream()
      const errorMsg = 'AI 流式连接中断'
      assistantMessage.content = assistantMessage.content || `[错误] ${errorMsg}`
      reject(new Error(errorMsg))
    }
  })
}

const scrollToBottom = async () => {
  await nextTick()
  const container = messageContainerRef.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

const fetchSessions = async () => {
  sessionLoading.value = true
  try {
    const previousActiveId = activeChatId.value
    const res = await getAllUserChatHisUsingPost({
      current: 1,
      pageSize: 30,
      chatType: CHAT_TYPE,
    })
    if (isSuccessCode(res.data.code) && res.data.data) {
      sessionList.value = res.data.data.records ?? []
      if (sessionList.value.length === 0) {
        activeChatId.value = ''
      } else if (
        previousActiveId &&
        sessionList.value.some((item) => item.chatId === previousActiveId)
      ) {
        activeChatId.value = previousActiveId
      } else {
        activeChatId.value = sessionList.value[0].chatId || ''
      }
      return
    }
  } finally {
    sessionLoading.value = false
  }
}

const fetchMessages = async (chatId: string) => {
  if (!chatId) {
    messageList.value = []
    return
  }
  messageLoading.value = true
  try {
    const res = await getChatHisVoPageUsingPost({
      chatId,
      current: 1,
      pageSize: 100,
    })
    if (isSuccessCode(res.data.code) && res.data.data) {
      messageList.value = res.data.data.records ?? []
      await scrollToBottom()
      return
    }
  } finally {
    messageLoading.value = false
  }
}

const switchSession = async (chatId?: string) => {
  const id = chatId || ''
  if (!id || id === activeChatId.value) {
    return
  }
  closeActiveStream()
  activeChatId.value = id
  await fetchMessages(id)
}

const openRenameModal = (session: AiChatSessionVO) => {
  renameTargetChatId.value = session.chatId || ''
  renameTitle.value = session.title || ''
  renameModalOpen.value = true
}

const submitRenameSession = async () => {
  const chatId = renameTargetChatId.value
  const title = renameTitle.value.trim()
  if (!chatId) {
    renameModalOpen.value = false
    return
  }
  if (!title) {
    message.warning('会话标题不能为空')
    return
  }
  if (title.length > 40) {
    message.warning('会话标题不能超过 40 字')
    return
  }

  renameLoading.value = true
  try {
    const res = await renameAiChatSessionUsingPost({ chatId, title })
    if (res.data.code === 200) {
      sessionList.value = sessionList.value.map((item) =>
        item.chatId === chatId ? { ...item, title } : item,
      )
      renameModalOpen.value = false
      message.success('会话已重命名')
    }
  } finally {
    renameLoading.value = false
  }
}

const togglePinSession = async (session: AiChatSessionVO) => {
  const chatId = session.chatId || ''
  if (!chatId) {
    return
  }
  const nextPinned = session.isPinned === 1 ? 0 : 1
  const res = await pinAiChatSessionUsingPost({
    chatId,
    isPinned: nextPinned,
  })
  if (res.data.code === 200) {
    await fetchSessions()
    message.success(nextPinned === 1 ? '会话已置顶' : '已取消置顶')
  }
}

const deleteSession = async (session: AiChatSessionVO) => {
  const chatId = session.chatId || ''
  if (!chatId) {
    return
  }

  Modal.confirm({
    title: '确认删除该会话？',
    content: '删除后该会话的历史消息将一并删除，且不可恢复。',
    okText: '删除',
    cancelText: '取消',
    okButtonProps: {
      danger: true,
    },
    async onOk() {
      const res = await deleteAiChatSessionUsingPost({ chatId })
      if (res.data.code !== 200) {
        return
      }
      if (activeChatId.value === chatId) {
        activeChatId.value = ''
        messageList.value = []
      }
      await fetchSessions()
      if (activeChatId.value) {
        await fetchMessages(activeChatId.value)
      }
      message.success('会话已删除')
    },
  })
}

const createNewSession = async (showTip = true) => {
  const res = await getNewChatIdUsingPost({ chatType: CHAT_TYPE })
  if (!isSuccessCode(res.data.code) || !res.data.data) {
    return ''
  }
  const chatId = res.data.data
  const newSession: AiChatSessionVO = {
    chatId,
    chatType: CHAT_TYPE,
    title: '新对话',
    previewContent: '',
    lastChatTime: new Date().toISOString(),
  }
  sessionList.value = [newSession, ...sessionList.value]
  activeChatId.value = chatId
  messageList.value = []
  if (showTip) {
    message.success('已创建新会话')
  }
  return chatId
}

const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content) {
    message.warning('请输入消息内容')
    return
  }
  if (content.length > 2000) {
    message.warning('消息长度不能超过 2000 字')
    return
  }

  let chatId = activeChatId.value
  if (!chatId) {
    chatId = await createNewSession(false)
    if (!chatId) {
      return
    }
  }

  const now = new Date().toISOString()
  messageList.value.push({
    chatId,
    chatType: CHAT_TYPE,
    roleType: 'USER',
    content,
    createTime: now,
  })
  inputMessage.value = ''
  await scrollToBottom()

  sending.value = true
  try {
    await streamChatReply(chatId, content)
    await fetchMessages(chatId)
    await fetchSessions()
    await scrollToBottom()
    return
  } catch (error: any) {
    message.error(error?.message || 'AI 回复失败')
    await fetchMessages(chatId)
    await fetchSessions()
  } finally {
    sending.value = false
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const formatTime = (value?: string) => {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleString()
}

onMounted(async () => {
  await fetchSessions()
  if (!activeChatId.value) {
    await createNewSession(false)
  }
  if (activeChatId.value) {
    await fetchMessages(activeChatId.value)
  }
})

onBeforeUnmount(() => {
  closeActiveStream()
})
</script>

<style scoped>
#userAiAssistantPage {
  margin-bottom: 20px;
}

.chat-card {
  min-height: 620px;
}

.session-list {
  max-height: 560px;
  overflow: auto;
}

.session-item {
  cursor: pointer;
  border-radius: 6px;
  padding: 10px;
  transition: background-color 0.2s;
}

.session-item:hover,
.session-item.active {
  background: #f0f7ff;
}

.session-preview {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.session-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.session-title-text {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.session-pin-icon {
  color: #1677ff;
}

.session-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.session-item:hover .session-actions,
.session-item.active .session-actions {
  opacity: 1;
}

.message-container {
  height: 460px;
  overflow-y: auto;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
}

.message-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.message-user {
  align-items: flex-end;
}

.message-assistant {
  align-items: flex-start;
}

.message-bubble {
  max-width: 82%;
  padding: 10px 12px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-user .message-bubble {
  background: #1677ff;
  color: #fff;
}

.message-assistant .message-bubble {
  background: #fff;
  border: 1px solid #e8e8e8;
  color: rgba(0, 0, 0, 0.88);
}

.message-time {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.input-wrapper {
  margin-top: 12px;
}

.input-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}
</style>
