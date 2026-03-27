<template>
  <a-modal
    class="image-text-generate"
    v-model:open="visible"
    title="AI 文生图"
    :width="showPromptOptimizer ? 1080 : 720"
    :footer="false"
    @cancel="closeModal"
  >
    <div class="modal-body" :class="{ 'with-optimizer': showPromptOptimizer }">
      <div class="generate-panel">
        <a-alert
          type="info"
          show-icon
          style="margin-bottom: 12px"
          message="使用规则：会员可免费使用 AI 生图，非会员每次消耗 20 积分。"
        />
        <a-form layout="vertical">
          <a-form-item label="提示词">
            <a-textarea
              v-model:value="prompt"
              placeholder="请输入你想生成的图片描述"
              :rows="4"
              allow-clear
            />
          </a-form-item>
          <a-space style="margin-bottom: 12px" wrap>
            <a-button ghost type="primary" @click="togglePromptOptimizer">
              {{ showPromptOptimizer ? '收起提示词优化' : '提示词优化' }}
            </a-button>
            <a-button :disabled="!prompt.trim()" @click="sendPromptToOptimizer">
              用当前提示词发给助手
            </a-button>
          </a-space>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="风格">
                <a-select v-model:value="style" :options="styleOptions" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="尺寸">
                <a-select v-model:value="size" :options="sizeOptions" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
        <div class="result-panel">
          <img v-if="resultImageUrl" :src="resultImageUrl" alt="AI 生成图片" style="max-width: 100%" />
          <a-empty v-else description="生成结果会显示在这里" />
        </div>
        <a-flex justify="center" gap="16">
          <a-button type="primary" :loading="generating" ghost @click="createTask">生成图片</a-button>
          <a-button v-if="resultImageUrl" type="primary" :loading="uploadLoading" @click="handleUpload">
            保存到图库
          </a-button>
        </a-flex>
      </div>

      <div v-if="showPromptOptimizer" class="optimizer-panel">
        <div class="optimizer-header">
          <span class="optimizer-title">AI 绘画助手（提示词优化）</span>
          <a-button type="link" :disabled="!latestAssistantReply" @click="useLatestAssistantReply">
            使用最新回复作为提示词
          </a-button>
        </div>
        <div class="optimizer-scroll-frame">
          <a-spin :spinning="optimizerLoading" style="width: 100%">
            <div ref="optimizerMessageRef" class="optimizer-messages">
              <a-empty
                v-if="!optimizerMessages.length"
                description="先描述你的创作需求，AI 会帮你优化文生图提示词"
              />
              <template v-else>
                <div
                  v-for="item in optimizerMessages"
                  :key="item.id || `${item.roleType}-${item.createTime}-${item.content}`"
                  class="optimizer-message-row"
                  :class="item.roleType === 'USER' ? 'message-user' : 'message-assistant'"
                >
                  <div class="optimizer-message-bubble">{{ item.content }}</div>
                  <div class="optimizer-message-time">{{ formatTime(item.createTime) }}</div>
                </div>
              </template>
            </div>
          </a-spin>
        </div>
        <div class="optimizer-input-wrapper">
          <a-textarea
            v-model:value="optimizerInput"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            :maxlength="2000"
            placeholder="输入需求，按 Enter 发送，Shift+Enter 换行"
            @keydown="onOptimizerInputKeydown"
          />
          <div class="optimizer-input-actions">
            <a-button type="primary" :loading="optimizerSending" @click="sendOptimizeMessage">发送</a-button>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  createPictureByTextUsingPost,
  getText2ImageTaskUsingGet,
  uploadPictureByUrlUsingPost,
} from '@/api/pictureController.ts'
import {
  doAiChatUsingPost,
  getChatHisVoPageUsingPost,
  getNewChatIdUsingPost,
  type AiChatMessageVO,
} from '@/api/userAiChatController'
import { toIdString } from '@/utils/id'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'

interface Props {
  spaceId?: string | number
  onSuccess?: (newPicture: API.PictureVO) => void
}

const props = defineProps<Props>()
const loginUserStore = useLoginUserStore()

const visible = ref(false)
const prompt = ref('')
const style = ref('<auto>')
const size = ref('1024*1024')
const resultImageUrl = ref('')
const taskId = ref<string>()
const generating = ref(false)
const uploadLoading = ref(false)
const AI_TEXT_GEN_COST = 20

const showPromptOptimizer = ref(false)
const drawChatId = ref('')
const optimizerMessages = ref<AiChatMessageVO[]>([])
const optimizerInput = ref('')
const optimizerSending = ref(false)
const optimizerLoading = ref(false)
const optimizerMessageRef = ref<HTMLElement>()
const DRAW_CHAT_TYPE = 'DRAW'
const DRAW_CHAT_PAGE_SIZE = 100

const styleOptions = [
  { label: '自动', value: '<auto>' },
  { label: '摄影', value: '<photography>' },
  { label: '动漫', value: '<anime>' },
  { label: '扁平插画', value: '<flat illustration>' },
]

const sizeOptions = [
  { label: '1024 x 1024', value: '1024*1024' },
  { label: '720 x 1280', value: '720*1280' },
  { label: '1280 x 720', value: '1280*720' },
]

let pollingTimer: ReturnType<typeof setInterval> | null = null

const latestAssistantReply = computed(() => {
  for (let i = optimizerMessages.value.length - 1; i >= 0; i--) {
    const current = optimizerMessages.value[i]
    if (current.roleType === 'ASSISTANT' && current.content?.trim()) {
      return current.content.trim()
    }
  }
  return ''
})

const getTaskId = (data?: API.Text2ImageTaskResponse) => {
  const output = data?.output as any
  return output?.taskId || output?.task_id
}

const isVipActive = () => {
  const loginUser = loginUserStore.loginUser
  if (!loginUser?.id) {
    return false
  }
  if (loginUser.userRole === 'admin') {
    return true
  }
  if (loginUser.userRole !== 'vip') {
    return false
  }
  if (!loginUser.vipExpireTime) {
    return false
  }
  return new Date(loginUser.vipExpireTime).getTime() > Date.now()
}

const ensureCanUseAiTextGen = async () => {
  await loginUserStore.fetchLoginUser()
  if (isVipActive()) {
    return true
  }
  const currentScore = Number(loginUserStore.loginUser.userScore ?? 0)
  if (currentScore >= AI_TEXT_GEN_COST) {
    return true
  }
  message.error(`积分不足：AI 生图需 ${AI_TEXT_GEN_COST} 积分，当前积分 ${currentScore}，请先获取积分或开通会员`)
  return false
}

const createTask = async () => {
  if (!prompt.value.trim()) {
    message.warning('请输入提示词')
    return
  }
  if (generating.value) {
    return
  }
  const canUse = await ensureCanUseAiTextGen()
  if (!canUse) {
    return
  }
  generating.value = true
  resultImageUrl.value = ''
  try {
    const res = await createPictureByTextUsingPost({
      input: {
        prompt: prompt.value.trim(),
      },
      parameters: {
        style: style.value,
        size: size.value,
        n: 1,
      },
    })
    const currentTaskId = getTaskId(res.data.data)
    if (res.data.code === 200 && currentTaskId) {
      taskId.value = currentTaskId
      message.success('创建文生图任务成功')
      startPolling(currentTaskId)
      return
    }
    generating.value = false
    if (res.data.code === 200) {
      message.error('创建文生图任务失败：未获取到任务编号')
    }
  } catch (error: any) {
    generating.value = false
    console.error('创建文生图任务失败', error)
  }
}

const startPolling = (currentTaskId: string) => {
  if (!currentTaskId) {
    generating.value = false
    return
  }
  clearPolling(false)
  taskId.value = currentTaskId
  pollingTimer = setInterval(async () => {
    try {
      const res = await getText2ImageTaskUsingGet({
        taskId: currentTaskId,
      })
      if (res.data.code !== 200 || !res.data.data?.output) {
        return
      }
      const taskResult = res.data.data.output as any
      const taskStatus = taskResult.taskStatus || taskResult.task_status
      if (taskStatus === 'SUCCEEDED') {
        const firstResult = taskResult.results?.[0]
        resultImageUrl.value = firstResult?.url || firstResult?.result_url || ''
        clearPolling()
        generating.value = false
        if (resultImageUrl.value) {
          message.success('图片生成成功')
        } else {
          message.warning('任务已完成，但未返回图片结果')
        }
      } else if (taskStatus === 'FAILED') {
        clearPolling()
        generating.value = false
        const failMessage = taskResult?.message || '图片生成失败'
        message.error(failMessage)
      }
    } catch (error: any) {
      clearPolling()
      generating.value = false
    }
  }, 3000)
}

const clearPolling = (resetTaskId = true) => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
  if (resetTaskId) {
    taskId.value = undefined
  }
}

const handleUpload = async () => {
  if (!resultImageUrl.value) {
    return
  }
  uploadLoading.value = true
  try {
    const spaceId = toIdString(props.spaceId)
    const res = await uploadPictureByUrlUsingPost({
      fileUrl: resultImageUrl.value,
      picName: prompt.value.trim().slice(0, 20) || 'AI生成图片',
      spaceId: spaceId as any,
    })
    if (res.data.code === 200 && res.data.data) {
      message.success('生成图片保存成功')
      props.onSuccess?.(res.data.data)
      closeModal()
    } else {
      if (res.data.code === 200) {
        message.error('保存图片失败：未返回图片数据')
      }
    }
  } catch (error: any) {
    console.error('保存图片失败', error)
  }
  uploadLoading.value = false
}

const scrollOptimizerToBottom = async () => {
  await nextTick()
  const container = optimizerMessageRef.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

const ensureDrawChatSession = async () => {
  if (drawChatId.value) {
    return drawChatId.value
  }
  const res = await getNewChatIdUsingPost({ chatType: DRAW_CHAT_TYPE })
  if (res.data.code === 200 && res.data.data) {
    drawChatId.value = res.data.data
    return drawChatId.value
  }
  return ''
}

const loadOptimizerMessages = async () => {
  const chatId = await ensureDrawChatSession()
  if (!chatId) {
    return
  }
  optimizerLoading.value = true
  try {
    const totalRes = await getChatHisVoPageUsingPost({
      chatId,
      current: 1,
      pageSize: 1,
    })
    if (totalRes.data.code !== 200 || !totalRes.data.data) {
      return
    }
    const total = Number(totalRes.data.data.total ?? 0)
    if (total <= 0) {
      optimizerMessages.value = []
      return
    }
    const lastPage = Math.max(1, Math.ceil(total / DRAW_CHAT_PAGE_SIZE))
    const res = await getChatHisVoPageUsingPost({
      chatId,
      current: lastPage,
      pageSize: DRAW_CHAT_PAGE_SIZE,
    })
    if (res.data.code !== 200 || !res.data.data) {
      return
    }
    optimizerMessages.value = res.data.data.records ?? []
    await scrollOptimizerToBottom()
  } finally {
    optimizerLoading.value = false
  }
}

const togglePromptOptimizer = async () => {
  showPromptOptimizer.value = !showPromptOptimizer.value
  if (showPromptOptimizer.value) {
    await loadOptimizerMessages()
  }
}

const sendOptimizeMessage = async () => {
  const content = optimizerInput.value.trim()
  if (!content) {
    message.warning('请输入要优化的描述')
    return
  }
  if (optimizerSending.value) {
    return
  }

  const chatId = await ensureDrawChatSession()
  if (!chatId) {
    return
  }

  optimizerMessages.value.push({
    chatId,
    chatType: DRAW_CHAT_TYPE,
    roleType: 'USER',
    content,
    createTime: new Date().toISOString(),
  })
  optimizerInput.value = ''
  await scrollOptimizerToBottom()

  optimizerSending.value = true
  try {
    const res = await doAiChatUsingPost({
      chatId,
      chatType: DRAW_CHAT_TYPE,
      userMessage: content,
    }, {
      timeout: 120000,
    })
    if (res.data.code === 200 && res.data.data) {
      optimizerMessages.value.push({
        chatId,
        chatType: DRAW_CHAT_TYPE,
        roleType: 'ASSISTANT',
        content: res.data.data,
        createTime: new Date().toISOString(),
      })
      await scrollOptimizerToBottom()
    } else {
      message.error(res.data.message || '提示词优化失败')
    }
  } catch (error: any) {
    message.error(error?.message || '提示词优化失败')
  } finally {
    optimizerSending.value = false
    await loadOptimizerMessages()
  }
}

const sendPromptToOptimizer = async () => {
  const promptText = prompt.value.trim()
  if (!promptText) {
    message.warning('请先输入提示词')
    return
  }
  if (!showPromptOptimizer.value) {
    showPromptOptimizer.value = true
    await loadOptimizerMessages()
  }
  optimizerInput.value = promptText
  await sendOptimizeMessage()
}

const useLatestAssistantReply = () => {
  if (!latestAssistantReply.value) {
    message.warning('暂无可用的优化结果')
    return
  }
  prompt.value = latestAssistantReply.value
  message.success('已应用到提示词')
}

const onOptimizerInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendOptimizeMessage()
  }
}

const formatTime = (value?: string) => {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleString()
}

const openModal = () => {
  loginUserStore.fetchLoginUser()
  visible.value = true
}

const closeModal = () => {
  clearPolling()
  generating.value = false
  uploadLoading.value = false
  showPromptOptimizer.value = false
  optimizerInput.value = ''
  visible.value = false
}

onUnmounted(() => {
  clearPolling()
})

defineExpose({
  openModal,
})
</script>

<style>
.image-text-generate .modal-body {
  display: flex;
  gap: 12px;
}

.image-text-generate .generate-panel {
  width: 100%;
  min-width: 0;
}

.image-text-generate .modal-body.with-optimizer .generate-panel {
  width: 58%;
}

.image-text-generate .optimizer-panel {
  width: 42%;
  min-width: 320px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  min-height: 520px;
}

.image-text-generate .optimizer-scroll-frame {
  flex: 1;
  min-height: 0;
  max-height: 430px;
  overflow: hidden;
}

.image-text-generate .optimizer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.image-text-generate .optimizer-title {
  font-weight: 600;
}

.image-text-generate .optimizer-messages {
  height: 430px;
  overflow-y: auto;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 10px;
}

.image-text-generate .optimizer-message-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
}

.image-text-generate .optimizer-message-row.message-user {
  align-items: flex-end;
}

.image-text-generate .optimizer-message-row.message-assistant {
  align-items: flex-start;
}

.image-text-generate .optimizer-message-bubble {
  max-width: 92%;
  padding: 8px 10px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.image-text-generate .message-user .optimizer-message-bubble {
  background: #1677ff;
  color: #fff;
}

.image-text-generate .message-assistant .optimizer-message-bubble {
  background: #fff;
  border: 1px solid #e8e8e8;
  color: rgba(0, 0, 0, 0.88);
}

.image-text-generate .optimizer-message-time {
  margin-top: 3px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.image-text-generate .optimizer-input-wrapper {
  margin-top: 8px;
}

.image-text-generate .optimizer-input-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.image-text-generate .result-panel {
  min-height: 240px;
  margin: 8px 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
