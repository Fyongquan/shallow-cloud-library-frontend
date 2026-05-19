<template>
  <div class="batch-local-picture-upload">
    <a-upload-dragger
      v-model:file-list="fileList"
      multiple
      :before-upload="beforeUpload"
      :custom-request="noopRequest"
      list-type="picture"
    >
      <p class="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p class="ant-upload-text">点击或拖拽图片到这里批量上传</p>
      <p class="ant-upload-hint">支持 JPG、PNG，单张不超过 10MB</p>
    </a-upload-dragger>

    <div class="actions">
      <a-space>
        <a-button type="primary" :loading="uploading" @click="handleBatchUpload">
          开始批量上传
        </a-button>
        <a-button :disabled="uploading || fileList.length === 0" @click="clearFiles">清空列表</a-button>
      </a-space>
      <a-typography-text type="secondary">
        已选择 {{ fileList.length }} 张图片，沿用当前空间和公开设置。
      </a-typography-text>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { InboxOutlined } from '@ant-design/icons-vue'
import type { UploadFile, UploadProps } from 'ant-design-vue'
import { message, Upload } from 'ant-design-vue'
import { uploadPictureByBatchUsingPost } from '@/api/pictureController'
import { toIdString } from '@/utils/id'

interface Props {
  spaceId?: number | string
  publishToPublic?: boolean
  onSuccess?: (result: { successCount: number }) => void
}

const props = defineProps<Props>()

const fileList = ref<UploadFile[]>([])
const uploading = ref(false)

const noopRequest = ({ onSuccess }: any) => {
  onSuccess?.({})
}

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isAllowedType = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!isAllowedType) {
    message.error(`文件 ${file.name} 不是 JPG 或 PNG 格式`)
    return Upload.LIST_IGNORE
  }
  const isLt10M = (file.size ?? 0) / 1024 / 1024 < 10
  if (!isLt10M) {
    message.error(`文件 ${file.name} 超过 10MB`)
    return Upload.LIST_IGNORE
  }
  return false
}

const clearFiles = () => {
  fileList.value = []
}

const handleBatchUpload = async () => {
  const files = fileList.value
    .map((file) => file.originFileObj as File | undefined)
    .filter((file): file is File => Boolean(file))
  if (files.length === 0) {
    message.warning('请先选择图片')
    return
  }
  uploading.value = true
  try {
    const spaceId = toIdString(props.spaceId)
    const res = await uploadPictureByBatchUsingPost(
      {
        spaceId: spaceId ?? undefined,
        publishToPublic: props.publishToPublic,
      },
      {},
      files,
    )
    if (res.data.code === 200) {
      const successCount = Number(res.data.data ?? 0)
      const failCount = Math.max(0, files.length - successCount)
      if (successCount > 0) {
        message.success(`批量上传完成，成功 ${successCount} 张，失败 ${failCount} 张`)
        clearFiles()
        props.onSuccess?.({ successCount })
        return
      }
      message.error(res.data.message || '批量上传失败')
      return
    }
    message.error(res.data.message || '批量上传失败')
  } catch (error) {
    console.error('batch upload picture error', error)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.batch-local-picture-upload {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
