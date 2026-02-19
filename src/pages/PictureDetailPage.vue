<template>
  <div id="pictureDetailPage">
    <a-row :gutter="[16, 16]">
      <!-- ???? -->
      <a-col :sm="24" :md="16" :xl="18">
        <a-card title="????">
          <a-image :src="picture.url" style="max-height: 600px; object-fit: contain" />
        </a-card>
      </a-col>
      <!-- ?????? -->
      <a-col :sm="24" :md="8" :xl="6">
        <a-card title="????">
          <a-descriptions :column="1">
            <a-descriptions-item label="??">
              <a-space>
                <a-avatar :size="24" :src="picture.user?.userAvatar" />
                <div>{{ picture.user?.userName }}</div>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="??">
              {{ picture.name ?? '???' }}
            </a-descriptions-item>
            <a-descriptions-item label="??">
              {{ picture.introduction ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="??">
              {{ picture.category ?? '??' }}
            </a-descriptions-item>
            <a-descriptions-item label="??">
              <a-tag v-for="tag in picture.tags" :key="tag">
                {{ tag }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="??">
              {{ picture.picFormat ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="??">
              {{ picture.picWidth ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="??">
              {{ picture.picHeight ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="???">
              {{ picture.picScale ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="??">
              {{ formatSize(picture.picSize) }}
            </a-descriptions-item>
            <a-descriptions-item label="???">
              <a-space>
                {{ picture.picColor ?? '-' }}
                <div
                  v-if="picture.picColor"
                  :style="{
                    width: '16px',
                    height: '16px',
                    backgroundColor: toHexColor(picture.picColor),
                  }"
                />
              </a-space>
            </a-descriptions-item>
          </a-descriptions>
          <!-- ???? -->
          <a-space wrap>
            <a-button type="primary" @click="doDownload">
              ????
              <template #icon>
                <DownloadOutlined />
              </template>
            </a-button>
            <a-button :icon="h(ShareAltOutlined)" type="primary" ghost @click="doShare">
              ??
            </a-button>
            <a-button v-if="canEdit" :icon="h(EditOutlined)" type="default" @click="doEdit">
              ??
            </a-button>
            <a-button v-if="canDelete" :icon="h(DeleteOutlined)" danger @click="doDelete">
              ??
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
    <ShareModal ref="shareModalRef" :link="shareLink" />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { deletePictureUsingPost, getPictureVoByIdUsingGet } from '@/api/pictureController.ts'
import { message } from 'ant-design-vue'
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ShareAltOutlined,
} from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'
import { downloadImage, formatSize, toHexColor } from '@/utils'
import ShareModal from '@/components/ShareModal.vue'
import { SPACE_PERMISSION_ENUM } from '@/constants/space.ts'

interface Props {
  id: string | number
}

const props = defineProps<Props>()
const picture = ref<API.PictureVO>({})

// ????????
function createPermissionChecker(permission: string) {
  return computed(() => {
    return (picture.value.permissionList ?? []).includes(permission)
  })
}

// ??????
const canEdit = createPermissionChecker(SPACE_PERMISSION_ENUM.PICTURE_EDIT)
const canDelete = createPermissionChecker(SPACE_PERMISSION_ENUM.PICTURE_DELETE)

// ??????
const fetchPictureDetail = async () => {
  try {
    const res = await getPictureVoByIdUsingGet({
      id: props.id,
    })
    if (res.data.code === 200 && res.data.data) {
      picture.value = res.data.data
    } else {
      message.error('?????????' + res.data.message)
    }
  } catch (e: any) {
    message.error('?????????' + e.message)
  }
}

onMounted(() => {
  fetchPictureDetail()
})

const router = useRouter()

// ??
const doEdit = () => {
  router.push({
    path: '/add_picture',
    query: {
      id: picture.value.id,
      spaceId: picture.value.spaceId,
    },
  })
}

// ????
const doDelete = async () => {
  const id = picture.value.id
  if (!id) {
    return
  }
  const res = await deletePictureUsingPost({ id })
  if (res.data.code === 200) {
    message.success('????')
  } else {
    message.error('????')
  }
}

// ????
const doDownload = () => {
  downloadImage(picture.value.url)
}

// ----- ???? ----
const shareModalRef = ref()
// ????
const shareLink = ref<string>()
// ??
const doShare = () => {
  shareLink.value = `${window.location.protocol}//${window.location.host}/picture/${picture.value.id}`
  if (shareModalRef.value) {
    shareModalRef.value.openModal()
  }
}
</script>

<style scoped>
#pictureDetailPage {
  margin-bottom: 16px;
}
</style>
