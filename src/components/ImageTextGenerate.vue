<template>
  <a-modal
    class="image-text-generate"
    v-model:visible="visible"
    title="AI Text To Image"
    :footer="false"
    @cancel="closeModal"
  >
    <a-form layout="vertical">
      <a-form-item label="Prompt">
        <a-textarea
          v-model:value="prompt"
          placeholder="Describe the image you want to generate"
          :rows="4"
          allow-clear
        />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Style">
            <a-select v-model:value="style" :options="styleOptions" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Size">
            <a-select v-model:value="size" :options="sizeOptions" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
    <div class="result-panel">
      <img v-if="resultImageUrl" :src="resultImageUrl" alt="AI generated image" style="max-width: 100%" />
      <a-empty v-else description="Generated image will be shown here" />
    </div>
    <a-flex justify="center" gap="16">
      <a-button type="primary" :loading="generating" ghost @click="createTask">Generate</a-button>
      <a-button v-if="resultImageUrl" type="primary" :loading="uploadLoading" @click="handleUpload">
        Save To Library
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
  { label: 'Auto', value: '<auto>' },
  { label: 'Photography', value: '<photography>' },
  { label: 'Anime', value: '<anime>' },
  { label: 'Flat Illustration', value: '<flat illustration>' },
]

const sizeOptions = [
  { label: '1024 x 1024', value: '1024*1024' },
  { label: '720 x 1280', value: '720*1280' },
  { label: '1280 x 720', value: '1280*720' },
]

let pollingTimer: ReturnType<typeof setInterval> | null = null

const createTask = async () => {
  if (!prompt.value.trim()) {
    message.warning('Please enter a prompt')
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
    if (res.data.code === 200 && res.data.data?.output?.taskId) {
      taskId.value = res.data.data.output.taskId
      message.success('Text-to-image task created')
      startPolling()
      return
    }
    generating.value = false
    message.error('Create task failed: ' + res.data.message)
  } catch (error: any) {
    generating.value = false
    message.error('Create task failed: ' + error.message)
  }
}

const startPolling = () => {
  if (!taskId.value) {
    generating.value = false
    return
  }
  clearPolling()
  pollingTimer = setInterval(async () => {
    try {
      const res = await getText2ImageTaskUsingGet({
        taskId: taskId.value,
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
          message.success('Image generated successfully')
        } else {
          message.warning('Task succeeded but no image was returned')
        }
      } else if (taskResult.taskStatus === 'FAILED') {
        clearPolling()
        generating.value = false
        message.error('Image generation failed')
      }
    } catch (error: any) {
      clearPolling()
      generating.value = false
      message.error('Query task failed: ' + error.message)
    }
  }, 3000)
}

const clearPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
  taskId.value = undefined
}

const handleUpload = async () => {
  if (!resultImageUrl.value) {
    return
  }
  uploadLoading.value = true
  try {
    const res = await uploadPictureByUrlUsingPost({
      fileUrl: resultImageUrl.value,
      picName: prompt.value.trim().slice(0, 20) || 'AI generated image',
      spaceId: props.spaceId,
    })
    if (res.data.code === 200 && res.data.data) {
      message.success('Generated image saved successfully')
      props.onSuccess?.(res.data.data)
      closeModal()
    } else {
      message.error('Save image failed: ' + res.data.message)
    }
  } catch (error: any) {
    message.error('Save image failed: ' + error.message)
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
