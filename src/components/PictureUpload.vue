<template>
  <div class="picture-upload">
    <a-upload
      list-type="picture-card"
      :show-upload-list="false"
      :custom-request="handleUpload"
      :before-upload="beforeUpload"
    >
      <img v-if="picture?.url" :src="picture.url" alt="picture" />
      <div v-else>
        <LoadingOutlined v-if="loading" />
        <PlusOutlined v-else />
        <div class="ant-upload-text">点击上传图片</div>
      </div>
    </a-upload>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons-vue'
import type { UploadProps } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import { uploadPictureUsingPost } from '@/api/pictureController'
import { toIdString } from '@/utils/id'

interface Props {
  picture?: API.PictureVO
  spaceId?: number | string
  publishToPublic?: boolean
  onSuccess?: (newPicture: API.PictureVO) => void
}

const props = defineProps<Props>()
const loading = ref(false)

const handleUpload = async ({ file }: any) => {
  loading.value = true
  try {
    const params: API.PictureUploadRequest = {}
    const pictureId = toIdString(props.picture?.id)
    const spaceId = toIdString(props.spaceId)
    if (pictureId) {
      params.id = pictureId as any
    }
    if (spaceId) {
      params.spaceId = spaceId as any
    }
    params.publishToPublic = props.publishToPublic
    const res = await uploadPictureUsingPost(params, {}, file)
    if (res.data.code === 200 && res.data.data) {
      props.onSuccess?.(res.data.data)
      return
    }
    message.error('图片上传失败：' + res.data.message)
  } catch (error: any) {
    console.error('upload picture error', error)
  } finally {
    loading.value = false
  }
}

const beforeUpload = (file: UploadProps['fileList'][number]) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!isJpgOrPng) {
    message.error('只能上传 JPG 或 PNG 格式的图片')
  }
  const isLt10M = (file.size ?? 0) / 1024 / 1024 < 10
  if (!isLt10M) {
    message.error('图片大小不能超过 10MB')
  }
  return isJpgOrPng && isLt10M
}
</script>

<style scoped>
.picture-upload :deep(.ant-upload) {
  width: 100% !important;
  height: 100% !important;
  min-width: 152px;
  min-height: 152px;
}

.picture-upload img {
  max-width: 100%;
  max-height: 480px;
}

.ant-upload-select-picture-card i {
  font-size: 32px;
  color: #999;
}

.ant-upload-select-picture-card .ant-upload-text {
  margin-top: 8px;
  color: #666;
}
</style>
