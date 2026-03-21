<template>
  <a-modal
    class="image-out-painting"
    v-model:open="visible"
    title="AI 扩图"
    :footer="false"
    @cancel="closeModal"
  >
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="使用规则：会员可免费使用 AI 扩图，非会员每次消耗 20 积分。"
    />
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
import { toIdString } from '@/utils/id'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'

interface Props {
  picture?: API.PictureVO
  spaceId?: string | number
  onSuccess?: (newPicture: API.PictureVO) => void
}

const props = defineProps<Props>()
const loginUserStore = useLoginUserStore()

const visible = ref(false)
const resultImageUrl = ref('')
const taskId = ref<string>()
const uploadLoading = ref(false)
const AI_OUT_PAINTING_COST = 20
const DEFAULT_OUT_PAINTING_OFFSET = 256

let pollingTimer: ReturnType<typeof setInterval> | null = null

const getTaskId = (data?: API.CreateOutPaintingTaskResponse) => {
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

const ensureCanUseAiOutPainting = async () => {
  await loginUserStore.fetchLoginUser()
  if (isVipActive()) {
    return true
  }
  const currentScore = Number(loginUserStore.loginUser.userScore ?? 0)
  if (currentScore >= AI_OUT_PAINTING_COST) {
    return true
  }
  message.error(
    `积分不足：AI 扩图需 ${AI_OUT_PAINTING_COST} 积分，当前积分 ${currentScore}，请先获取积分或开通会员`,
  )
  return false
}

const createTask = async () => {
  const pictureId = toIdString(props.picture?.id)
  if (!pictureId) {
    message.warning('请先选择要扩图的图片')
    return
  }
  const canUse = await ensureCanUseAiOutPainting()
  if (!canUse) {
    return
  }
  try {
    const res = await createPictureOutPaintingTaskUsingPost({
      pictureId: pictureId as any,
      parameters: {
        topOffset: DEFAULT_OUT_PAINTING_OFFSET,
        bottomOffset: DEFAULT_OUT_PAINTING_OFFSET,
        leftOffset: DEFAULT_OUT_PAINTING_OFFSET,
        rightOffset: DEFAULT_OUT_PAINTING_OFFSET,
      },
    })
    const currentTaskId = getTaskId(res.data.data)
    if (res.data.code === 200 && currentTaskId) {
      message.success('创建扩图任务成功，请耐心等待')
      taskId.value = currentTaskId
      startPolling(currentTaskId)
      return
    }
    if (res.data.code === 200) {
      message.error('\u521b\u5efa\u6269\u56fe\u4efb\u52a1\u5931\u8d25\uff1a\u672a\u83b7\u53d6\u5230\u4efb\u52a1\u7f16\u53f7')
    }
  } catch (error: any) {
    console.error('\u521b\u5efa\u6269\u56fe\u4efb\u52a1\u5931\u8d25', error)
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
      const taskResult = res.data.data?.output as any
      if (res.data.code !== 200 || !taskResult) {
        return
      }
      const taskStatus = taskResult.taskStatus || taskResult.task_status
      if (taskStatus === 'SUCCEEDED') {
        resultImageUrl.value = taskResult.outputImageUrl || taskResult.output_image_url || ''
        if (resultImageUrl.value) {
          message.success('扩图任务执行成功')
        } else {
          message.warning('扩图任务已完成，但未返回结果图片')
        }
        clearPolling()
      } else if (taskStatus === 'FAILED') {
        const failReason = taskResult.message ? `?${taskResult.message}` : ''
        message.error(`????????${failReason}`)
        clearPolling()
      }
    } catch (error: any) {
      console.error('扩图任务轮询失败', error)
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
    const spaceId = toIdString(props.spaceId)
    const pictureId = toIdString(props.picture?.id)
    const params: API.PictureUploadRequest = {
      fileUrl: resultImageUrl.value,
    }
    if (spaceId) {
      params.spaceId = spaceId as any
    }
    if (pictureId) {
      params.id = pictureId as any
    }
    const res = await uploadPictureByUrlUsingPost(params)
    if (res.data.code === 200 && res.data.data) {
      message.success('图片上传成功')
      props.onSuccess?.(res.data.data)
      closeModal()
    } else {
      if (res.data.code === 200) {
        message.error('\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff1a\u672a\u8fd4\u56de\u56fe\u7247\u6570\u636e')
      }
    }
  } catch (error: any) {
    console.error('\u56fe\u7247\u4e0a\u4f20\u5931\u8d25', error)
  }
  uploadLoading.value = false
}

const openModal = () => {
  loginUserStore.fetchLoginUser()
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
