<template>
  <a-modal
    class="image-out-painting"
    v-model:visible="visible"
    title="AI 扩图"
    :footer="false"
    @cancel="closeModal"
  >
    <a-row :gutter="16">
      <a-col :span="12">
        <h4>原始图片</h4>
        <img :src="picture?.url" :alt="picture?.name" style="max-width: 100%" />
      </a-col>
      <a-col :span="12">
        <h4>扩图结果</h4>
        <img v-if="resultImageUrl" :src="resultImageUrl" :alt="picture?.name" style="max-width: 100%" />
        <a-empty v-else description="结果图片将在这里显示" />
      </a-col>
    </a-row>
    <div style="margin-bottom: 16px" />
    <a-flex justify="center" gap="16">
      <a-button type="primary" :loading="!!taskId" ghost @click="createTask">生成图片</a-button>
      <a-button v-if="resultImageUrl" type="primary" :loading="uploadLoading" @click="handleUpload">
        应用结果
      </a-button>
    </a-flex>
  </a-modal>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  createPictureOutPaintingTaskUsingPost,
  getPictureOutPaintingTaskUsingGet,
  uploadPictureByUrlUsingPost,
} from '@/api/pictureController.ts'

interface Props {
  picture?: API.PictureVO
  spaceId?: string | number
  onSuccess?: (newPicture: API.PictureVO) => void
}

const props = defineProps<Props>()

const visible = ref(false)
const resultImageUrl = ref('')
const taskId = ref<string>()
const uploadLoading = ref(false)

let pollingTimer: ReturnType<typeof setInterval> | null = null

const createTask = async () => {
  if (!props.picture?.id) {
    message.warning('请先选择要扩图的图片')
    return
  }
  try {
    const res = await createPictureOutPaintingTaskUsingPost({
      pictureId: props.picture.id,
      parameters: {
        xScale: 2,
        yScale: 2,
      },
    })
    const currentTaskId = res.data.data?.output?.taskId
    if (res.data.code === 200 && currentTaskId) {
      message.success('创建扩图任务成功，请耐心等待')
      taskId.value = currentTaskId
      startPolling(currentTaskId)
      return
    }
    message.error('创建扩图任务失败：' + (res.data.message || '未获取到任务编号'))
  } catch (error: any) {
    message.error('创建扩图任务失败：' + (error?.message || '未知错误'))
  }
}

const startPolling = (currentTaskId: string) => {
  clearPolling(false)
  taskId.value = currentTaskId
  pollingTimer = setInterval(async () => {
    try {
      const res = await getPictureOutPaintingTaskUsingGet({
        taskId: currentTaskId,
      })
      const taskResult = res.data.data?.output
      if (res.data.code !== 200 || !taskResult) {
        return
      }
      if (taskResult.taskStatus === 'SUCCEEDED') {
        resultImageUrl.value = taskResult.outputImageUrl ?? ''
        if (resultImageUrl.value) {
          message.success('扩图任务执行成功')
        } else {
          message.warning('扩图任务已完成，但未返回结果图片')
        }
        clearPolling()
      } else if (taskResult.taskStatus === 'FAILED') {
        message.error('扩图任务执行失败')
        clearPolling()
      }
    } catch (error: any) {
      console.error('扩图任务轮询失败', error)
      message.error('扩图任务轮询失败：' + (error?.message || '未知错误'))
      clearPolling()
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
    const params: API.PictureUploadRequest = {
      fileUrl: resultImageUrl.value,
      spaceId: props.spaceId,
    }
    if (props.picture?.id) {
      params.id = props.picture.id
    }
    const res = await uploadPictureByUrlUsingPost(params)
    if (res.data.code === 200 && res.data.data) {
      message.success('图片上传成功')
      props.onSuccess?.(res.data.data)
      closeModal()
    } else {
      message.error('图片上传失败：' + res.data.message)
    }
  } catch (error: any) {
    console.error('图片上传失败', error)
    message.error('图片上传失败：' + (error?.message || '未知错误'))
  }
  uploadLoading.value = false
}

const openModal = () => {
  visible.value = true
}

const closeModal = () => {
  clearPolling()
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
.image-out-painting {
  text-align: center;
}
</style>
