<template>
  <a-modal
    class="image-text-generate"
    v-model:open="visible"
    title="AI 文生图"
    :footer="false"
    @cancel="closeModal"
  >
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
  </a-modal>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  createPictureByTextUsingPost,
  getText2ImageTaskUsingGet,
  uploadPictureByUrlUsingPost,
} from '@/api/pictureController.ts'
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
      message.error('\u521b\u5efa\u6587\u751f\u56fe\u4efb\u52a1\u5931\u8d25\uff1a\u672a\u83b7\u53d6\u5230\u4efb\u52a1\u7f16\u53f7')
    }
  } catch (error: any) {
    generating.value = false
    console.error('\u521b\u5efa\u6587\u751f\u56fe\u4efb\u52a1\u5931\u8d25', error)
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
        message.error('图片生成失败')
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
        message.error('\u4fdd\u5b58\u56fe\u7247\u5931\u8d25\uff1a\u672a\u8fd4\u56de\u56fe\u7247\u6570\u636e')
      }
    }
  } catch (error: any) {
    console.error('\u4fdd\u5b58\u56fe\u7247\u5931\u8d25', error)
  }
  uploadLoading.value = false
}

const openModal = () => {
  loginUserStore.fetchLoginUser()
  visible.value = true
}

const closeModal = () => {
  clearPolling()
  generating.value = false
  uploadLoading.value = false
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
.image-text-generate .result-panel {
  min-height: 240px;
  margin: 8px 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
