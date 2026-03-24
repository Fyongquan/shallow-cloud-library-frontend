<template>
  <a-modal
    class="image-cropper"
    v-model:visible="visible"
    title="编辑图片"
    :footer="false"
    @cancel="closeModal"
  >
    <div v-if="isTeamSpace" class="collab-panel">
      <div class="collab-row">
        <span class="collab-label">在线成员</span>
        <a-space wrap>
          <a-tag v-for="user in onlineUsers" :key="user.id" class="member-tag">
            <a-avatar :size="20" :src="user.userAvatar">
              {{ user.userName?.slice(0, 1) || '图' }}
            </a-avatar>
            <span>{{ user.userName }}</span>
            <span v-if="isCurrentUser(user)">（我）</span>
          </a-tag>
          <span v-if="!onlineUsers.length" class="empty-text">当前暂无其他在线成员</span>
        </a-space>
      </div>
      <a-alert
        v-if="editingUser"
        class="editing-alert"
        :type="isCurrentUser(editingUser) ? 'success' : 'warning'"
        show-icon
        :message="isCurrentUser(editingUser) ? '你正在编辑当前图片' : `${editingUser.userName} 正在编辑当前图片`"
      />
      <a-alert
        v-else
        class="editing-alert"
        type="info"
        show-icon
        message="当前暂无成员正在编辑这张图片"
      />
    </div>

    <vue-cropper
      ref="cropperRef"
      :img="imageUrl"
      output-type="png"
      :info="true"
      :can-move-box="true"
      :fixed-box="false"
      :auto-crop="true"
      :center-box="true"
    />

    <div class="toolbar-gap" />

    <div class="image-edit-actions" v-if="isTeamSpace">
      <a-space wrap>
        <a-button v-if="editingUser && !isCurrentUser(editingUser)" disabled>
          {{ editingUser.userName }} 正在编辑
        </a-button>
        <a-button v-if="canEnterEdit" type="primary" ghost @click="enterEdit">进入编辑</a-button>
        <a-button v-if="canExitEdit" danger ghost @click="exitEdit">退出编辑</a-button>
      </a-space>
    </div>

    <div class="toolbar-gap" />

    <div class="image-cropper-actions">
      <a-space wrap>
        <a-button @click="handleRotateLeft" :disabled="!canEdit">向左旋转</a-button>
        <a-button @click="handleRotateRight" :disabled="!canEdit">向右旋转</a-button>
        <a-button @click="handleZoomIn" :disabled="!canEdit">放大</a-button>
        <a-button @click="handleZoomOut" :disabled="!canEdit">缩小</a-button>
        <a-button type="primary" :loading="loading" :disabled="!canEdit" @click="handleConfirm">
          确认
        </a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { uploadPictureUsingPost } from '@/api/pictureController.ts'
import { message } from 'ant-design-vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import PictureEditWebSocket from '@/utils/pictureEditWebSocket.ts'
import { PICTURE_EDIT_ACTION_ENUM, PICTURE_EDIT_MESSAGE_TYPE_ENUM } from '@/constants/picture.ts'
import { SPACE_TYPE_ENUM } from '@/constants/space.ts'
import { toIdString } from '@/utils/id'

interface Props {
  imageUrl?: string
  picture?: API.PictureVO
  spaceId?: number | string
  space?: API.SpaceVO
  onSuccess?: (newPicture: API.PictureVO) => void
}

const props = defineProps<Props>()

const visible = ref(false)
const loading = ref(false)
const cropperRef = ref()
const onlineUsers = ref<API.UserVO[]>([])
const editingUser = ref<API.UserVO>()

const loginUserStore = useLoginUserStore()
const loginUser = loginUserStore.loginUser

const isTeamSpace = computed(() => props.space?.spaceType === SPACE_TYPE_ENUM.TEAM)

const canEnterEdit = computed(() => isTeamSpace.value && !editingUser.value)
const canExitEdit = computed(() => Boolean(editingUser.value && isCurrentUser(editingUser.value)))
const canEdit = computed(() => {
  if (!isTeamSpace.value) {
    return true
  }
  return Boolean(editingUser.value && isCurrentUser(editingUser.value))
})

let websocket: PictureEditWebSocket | null = null

const isCurrentUser = (user?: API.UserVO) => {
  if (!user?.id || !loginUser?.id) {
    return false
  }
  return String(user.id) === String(loginUser.id)
}

const applyScale = (step: number) => {
  cropperRef.value?.changeScale(step)
}

const applyRotateLeft = () => {
  cropperRef.value?.rotateLeft()
}

const applyRotateRight = () => {
  cropperRef.value?.rotateRight()
}

const handleZoomIn = () => {
  applyScale(1)
  syncEditAction(PICTURE_EDIT_ACTION_ENUM.ZOOM_IN)
}

const handleZoomOut = () => {
  applyScale(-1)
  syncEditAction(PICTURE_EDIT_ACTION_ENUM.ZOOM_OUT)
}

const handleRotateLeft = () => {
  applyRotateLeft()
  syncEditAction(PICTURE_EDIT_ACTION_ENUM.ROTATE_LEFT)
}

const handleRotateRight = () => {
  applyRotateRight()
  syncEditAction(PICTURE_EDIT_ACTION_ENUM.ROTATE_RIGHT)
}

const handleConfirm = () => {
  cropperRef.value?.getCropBlob((blob: Blob) => {
    const fileName = `${props.picture?.name || 'image'}.png`
    const file = new File([blob], fileName, { type: blob.type || 'image/png' })
    handleUpload(file)
  })
}

const handleUpload = async (file: File) => {
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
    const res = await uploadPictureUsingPost(params, {}, file)
    if (res.data.code === 200 && res.data.data) {
      message.success('图片上传成功')
      props.onSuccess?.(res.data.data)
      closeModal()
    } else {
      message.error(`图片上传失败：${res.data.message}`)
    }
  } catch (error: any) {
    console.error('图片上传失败', error)
  } finally {
    loading.value = false
  }
}

const resetCollabState = () => {
  onlineUsers.value = []
  editingUser.value = undefined
}

const cleanupWebsocket = () => {
  if (websocket) {
    websocket.disconnect()
    websocket = null
  }
  resetCollabState()
}

const initWebsocket = () => {
  const pictureId = toIdString(props.picture?.id)
  if (!pictureId || !visible.value || !isTeamSpace.value) {
    return
  }
  cleanupWebsocket()
  websocket = new PictureEditWebSocket(pictureId)
  websocket.connect()

  websocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.INFO, (msg) => {
    if (msg?.message) {
      message.info(msg.message)
    }
  })

  websocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.ERROR, (msg) => {
    if (msg?.message) {
      message.warning(msg.message)
    }
  })

  websocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.SYNC_STATUS, (msg) => {
    onlineUsers.value = msg?.onlineUsers || []
    editingUser.value = msg?.editingUser
  })

  websocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.ENTER_EDIT, (msg) => {
    if (msg?.message) {
      message.info(msg.message)
    }
    editingUser.value = msg?.user
  })

  websocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.EDIT_ACTION, (msg) => {
    switch (msg?.editAction) {
      case PICTURE_EDIT_ACTION_ENUM.ROTATE_LEFT:
        applyRotateLeft()
        break
      case PICTURE_EDIT_ACTION_ENUM.ROTATE_RIGHT:
        applyRotateRight()
        break
      case PICTURE_EDIT_ACTION_ENUM.ZOOM_IN:
        applyScale(1)
        break
      case PICTURE_EDIT_ACTION_ENUM.ZOOM_OUT:
        applyScale(-1)
        break
      default:
        break
    }
  })

  websocket.on(PICTURE_EDIT_MESSAGE_TYPE_ENUM.EXIT_EDIT, (msg) => {
    if (msg?.message) {
      message.info(msg.message)
    }
    editingUser.value = undefined
  })
}

watch(
  () => [visible.value, props.picture?.id, isTeamSpace.value],
  ([currentVisible, currentPictureId, currentIsTeamSpace]) => {
    if (currentVisible && currentPictureId && currentIsTeamSpace) {
      initWebsocket()
      return
    }
    cleanupWebsocket()
  }
)

onUnmounted(() => {
  cleanupWebsocket()
})

const openModal = () => {
  visible.value = true
}

const closeModal = () => {
  visible.value = false
}

const enterEdit = () => {
  websocket?.sendMessage({
    type: PICTURE_EDIT_MESSAGE_TYPE_ENUM.ENTER_EDIT,
  })
}

const exitEdit = () => {
  websocket?.sendMessage({
    type: PICTURE_EDIT_MESSAGE_TYPE_ENUM.EXIT_EDIT,
  })
}

const syncEditAction = (action: string) => {
  if (!isTeamSpace.value || !canEdit.value) {
    return
  }
  websocket?.sendMessage({
    type: PICTURE_EDIT_MESSAGE_TYPE_ENUM.EDIT_ACTION,
    editAction: action,
  })
}

defineExpose({
  openModal,
})
</script>

<style>
.image-cropper {
  text-align: center;
}

.image-cropper .vue-cropper {
  height: 400px !important;
}

.collab-panel {
  margin-bottom: 16px;
  text-align: left;
}

.collab-row {
  margin-bottom: 12px;
}

.collab-label {
  display: inline-block;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
}

.member-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  padding: 4px 8px;
}

.empty-text {
  color: rgba(0, 0, 0, 0.45);
}

.editing-alert {
  margin-bottom: 12px;
}

.toolbar-gap {
  margin-bottom: 16px;
}
</style>
