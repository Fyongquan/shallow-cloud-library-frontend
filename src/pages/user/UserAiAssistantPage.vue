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
                      <span>{{ item.title || '新对话' }}</span>
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
              placeholder="请输入你的问题，按 Ctrl+Enter 发送"
              @keydown="onKeydown"
            />
            <div class="input-actions">
              <a-button type="primary" :loading="sending" @click="sendMessage">发送</a-button>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  doAiChatUsingPost,
  getAllUserChatHisUsingPost,
  getChatHisVoPageUsingPost,
  getNewChatIdUsingPost,
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

const activeSessionTitle = computed(() => {
  const current = sessionList.value.find((item) => item.chatId === activeChatId.value)
  return current?.title || 'AI 助手'
})

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
    const res = await getAllUserChatHisUsingPost({
      current: 1,
      pageSize: 30,
      chatType: CHAT_TYPE,
    })
    if (res.data.code === 200 && res.data.data) {
      sessionList.value = res.data.data.records ?? []
      if (!activeChatId.value && sessionList.value.length > 0) {
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
    if (res.data.code === 200 && res.data.data) {
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
  activeChatId.value = id
  await fetchMessages(id)
}

const createNewSession = async (showTip = true) => {
  const res = await getNewChatIdUsingPost({ chatType: CHAT_TYPE })
  if (res.data.code !== 200 || !res.data.data) {
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
    const res = await doAiChatUsingPost({
      chatId,
      chatType: CHAT_TYPE,
      userMessage: content,
    })
    if (res.data.code === 200) {
      const assistantContent = `${res.data.data ?? ''}`.trim()
      if (assistantContent) {
        messageList.value.push({
          chatId,
          chatType: CHAT_TYPE,
          roleType: 'ASSISTANT',
          content: assistantContent,
          createTime: new Date().toISOString(),
        })
        await scrollToBottom()
      }
      // Re-sync from backend to avoid UI lag caused by local state drift.
      await fetchMessages(chatId)
      await fetchSessions()
      return
    }
  } finally {
    sending.value = false
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'Enter') {
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
