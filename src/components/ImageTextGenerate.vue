<template>
  <a-modal
    class="image-text-generate"
    v-model:visible="visible"
    title="AI 文生图"
    :footer="false"
    @cancel="closeModal"
  >
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

interface Props {
  spaceId?: string | number
  onSuccess?: (newPicture: API.PictureVO) => void
}

const props = defineProps<Props>()

const visible = ref(false)
const prompt = ref('')
const style = ref('<auto>')
const size = ref('1024*1024')
const resultImageUrl = ref('')
const taskId = ref<string>()
const generating = ref(false)
const uploadLoading = ref(false)

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

const createTask = async () => {
  if (!prompt.value.trim()) {
    message.warning('请输入提示词')
    return
  }
  if (generating.value) {
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
    const currentTaskId = res.data.data?.output?.taskId
    if (res.data.code === 200 && currentTaskId) {
      taskId.value = currentTaskId
      message.success('创建文生图任务成功')
      startPolling(currentTaskId)
      return
    }
    generating.value = false
    message.error('创建文生图任务失败：' + res.data.message)
  } catch (error: any) {
    generating.value = false
    message.error('创建文生图任务失败：' + error.message)
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
      const taskResult = res.data.data.output
      if (taskResult.taskStatus === 'SUCCEEDED') {
        resultImageUrl.value = taskResult.results?.[0]?.url ?? ''
        clearPolling()
        generating.value = false
        if (resultImageUrl.value) {
          message.success('图片生成成功')
        } else {
          message.warning('任务已完成，但未返回图片结果')
        }
      } else if (taskResult.taskStatus === 'FAILED') {
        clearPolling()
        generating.value = false
        message.error('图片生成失败')
      }
    } catch (error: any) {
      clearPolling()
      generating.value = false
      message.error('查询任务失败：' + error.message)
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
    const res = await uploadPictureByUrlUsingPost({
      fileUrl: resultImageUrl.value,
      picName: prompt.value.trim().slice(0, 20) || 'AI生成图片',
      spaceId: props.spaceId,
    })
    if (res.data.code === 200 && res.data.data) {
      message.success('生成图片保存成功')
      props.onSuccess?.(res.data.data)
      closeModal()
    } else {
      message.error('保存图片失败：' + res.data.message)
    }
  } catch (error: any) {
    message.error('保存图片失败：' + error.message)
  }
  uploadLoading.value = false
}

const openModal = () => {
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
