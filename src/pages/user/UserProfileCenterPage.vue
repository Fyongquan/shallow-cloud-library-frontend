<template>
  <div id="userProfilePage" class="page-shell">
    <div class="page-scroll profile-scroll">
      <a-card title="个人中心" :bordered="false">
        <a-card size="small" style="margin-bottom: 16px">
          <a-space style="width: 100%; justify-content: space-between">
            <span>当前积分：{{ loginUserStore.loginUser.userScore ?? 0 }}</span>
            <a-button type="primary" @click="goVipMall">进入会员商城</a-button>
          </a-space>
        </a-card>

        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="profile" tab="资料设置">
            <a-alert
              type="info"
              show-icon
              style="margin-bottom: 16px"
              message="你的用户 ID 可用于加入团队空间时被管理员添加，请妥善保存。"
            >
              <template #description>
                <a-space wrap>
                  <span>当前用户 ID：{{ loginUserStore.loginUser.id || '-' }}</span>
                  <a-button size="small" @click="copyUserId" :disabled="!loginUserStore.loginUser.id">
                    复制 ID
                  </a-button>
                </a-space>
              </template>
            </a-alert>

            <a-form layout="vertical" :model="profileForm" @finish="saveProfile">
              <a-form-item
                label="用户昵称"
                name="userName"
                :rules="[{ required: true, message: '请输入用户昵称' }]"
              >
                <a-input v-model:value="profileForm.userName" placeholder="请输入用户昵称" />
              </a-form-item>

              <a-form-item label="头像设置">
                <a-space direction="vertical" style="width: 100%">
                  <a-space>
                    <a-avatar :size="72" :src="profileForm.userAvatar">
                      {{ profileForm.userName?.slice(0, 1) || '用' }}
                    </a-avatar>
                    <a-space>
                      <a-button type="primary" @click="openAvatarModal">从我的图片中选择</a-button>
                      <a-button @click="clearAvatar">清空头像</a-button>
                    </a-space>
                  </a-space>
                  <div class="avatar-tip">
                    选择图片后可以继续裁剪，最终会将头像地址直接保存到用户资料中。
                  </div>
                </a-space>
              </a-form-item>

              <a-form-item label="个人简介" name="userProfile">
                <a-textarea
                  v-model:value="profileForm.userProfile"
                  :rows="4"
                  :maxlength="500"
                  show-count
                  placeholder="请输入个人简介"
                />
              </a-form-item>

              <a-form-item>
                <a-button type="primary" html-type="submit" :loading="profileLoading">
                  保存资料
                </a-button>
              </a-form-item>
            </a-form>
          </a-tab-pane>

          <a-tab-pane key="password" tab="修改密码">
            <a-alert
              type="warning"
              show-icon
              style="margin-bottom: 16px"
              message="修改密码成功后将自动退出登录，请使用新密码重新登录。"
            />
            <a-form layout="vertical" :model="passwordForm" @finish="savePassword">
              <a-form-item
                label="原密码"
                name="oldPassword"
                :rules="[{ required: true, message: '请输入原密码' }]"
              >
                <a-input-password
                  v-model:value="passwordForm.oldPassword"
                  placeholder="请输入原密码"
                />
              </a-form-item>

              <a-form-item
                label="新密码"
                name="newPassword"
                :rules="[
                  { required: true, message: '请输入新密码' },
                  { min: 8, message: '新密码长度不能小于 8 位' },
                ]"
              >
                <a-input-password
                  v-model:value="passwordForm.newPassword"
                  placeholder="请输入新密码"
                />
              </a-form-item>

              <a-form-item
                label="确认新密码"
                name="checkPassword"
                :rules="[
                  { required: true, message: '请再次输入新密码' },
                  { min: 8, message: '确认密码长度不能小于 8 位' },
                ]"
              >
                <a-input-password
                  v-model:value="passwordForm.checkPassword"
                  placeholder="请再次输入新密码"
                />
              </a-form-item>

              <a-form-item>
                <a-button type="primary" html-type="submit" :loading="passwordLoading">
                  修改密码
                </a-button>
              </a-form-item>
            </a-form>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <a-modal
      v-model:open="avatarModalOpen"
      title="从我的图片中选择头像"
      width="920px"
      :footer="null"
      @cancel="avatarModalOpen = false"
    >
      <a-spin :spinning="avatarLoading">
        <div v-if="avatarPictures.length > 0">
          <a-row :gutter="[16, 16]">
            <a-col
              v-for="picture in avatarPictures"
              :key="picture.id"
              :xs="12"
              :sm="8"
              :md="6"
            >
              <div class="avatar-picture-card" @click="selectAvatarPicture(picture)">
                <img
                  class="avatar-picture-image"
                  :src="picture.thumbnailUrl ?? picture.url"
                  :alt="picture.name ?? '头像图片'"
                />
                <div class="avatar-picture-name">{{ picture.name ?? '未命名图片' }}</div>
              </div>
            </a-col>
          </a-row>
          <div class="avatar-pagination">
            <a-pagination
              :current="avatarCurrent"
              :page-size="avatarPageSize"
              :total="avatarTotal"
              @change="changeAvatarPage"
            />
          </div>
        </div>
        <a-empty v-else description="你还没有可选的图片，先去上传几张图片吧" />
      </a-spin>
    </a-modal>

    <a-modal
      class="avatar-cropper-modal"
      v-model:open="cropModalOpen"
      title="裁剪头像"
      width="720px"
      destroy-on-close
      :confirm-loading="cropUploading"
      ok-text="确认裁剪"
      cancel-text="取消"
      @ok="confirmCrop"
      @cancel="closeCropModal"
    >
      <div class="cropper-wrapper">
        <vue-cropper
          v-if="cropModalOpen && cropSourceUrl"
          ref="cropperRef"
          :img="cropSourceUrl"
          output-type="png"
          :info="true"
          :auto-crop="true"
          :fixed="true"
          :fixed-number="[1, 1]"
          :fixed-box="true"
          :center-box="true"
          :can-move="true"
          :can-move-box="true"
          :original="false"
        />
      </div>
      <div class="cropper-tip">建议将头像裁剪为正方形，展示效果会更好。</div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import {
  updateMyUserPasswordUsingPost,
  updateMyUserUsingPost,
  uploadUserAvatarUsingPost,
  userLogoutUsingPost,
} from '@/api/userController'
import { listMyPictureVoByPageUsingPost } from '@/api/pictureController'

const router = useRouter()
const loginUserStore = useLoginUserStore()

const goVipMall = () => {
  router.push('/user_exchange_vip')
}

const activeTab = ref<'profile' | 'password'>('profile')
const profileLoading = ref(false)
const passwordLoading = ref(false)
const avatarModalOpen = ref(false)
const cropModalOpen = ref(false)
const avatarLoading = ref(false)
const cropUploading = ref(false)
const cropSourceUrl = ref('')
const cropperRef = ref<any>()
const avatarPictures = ref<API.PictureVO[]>([])
const avatarCurrent = ref(1)
const avatarPageSize = 12
const avatarTotal = ref(0)

const profileForm = reactive<API.UserProfileUpdateRequest>({
  userName: '',
  userAvatar: '',
  userProfile: '',
})

const passwordForm = reactive<API.UserPasswordUpdateRequest>({
  oldPassword: '',
  newPassword: '',
  checkPassword: '',
})

const syncProfileForm = () => {
  const loginUser = loginUserStore.loginUser
  profileForm.userName = loginUser.userName ?? ''
  profileForm.userAvatar = loginUser.userAvatar ?? ''
  profileForm.userProfile = loginUser.userProfile ?? ''
}

const copyUserId = async () => {
  const userId = loginUserStore.loginUser.id
  if (!userId) {
    message.warning('当前暂无可复制的用户 ID')
    return
  }
  try {
    await navigator.clipboard.writeText(String(userId))
    message.success('用户 ID 已复制')
  } catch {
    message.error('复制失败，请手动记录用户 ID')
  }
}

const loadAvatarPictures = async (current = 1) => {
  avatarLoading.value = true
  try {
    const res = await listMyPictureVoByPageUsingPost({
      current,
      pageSize: avatarPageSize,
      sortField: 'createTime',
      sortOrder: 'descend',
    })
    if (res.data.code === 200 && res.data.data) {
      avatarPictures.value = res.data.data.records ?? []
      avatarCurrent.value = Number(res.data.data.current ?? current)
      avatarTotal.value = Number(res.data.data.total ?? 0)
      return
    }
    message.error(`加载头像图片失败：${res.data.message ?? '未知错误'}`)
  } finally {
    avatarLoading.value = false
  }
}

onMounted(async () => {
  await loginUserStore.fetchLoginUser()
  syncProfileForm()
})

const openAvatarModal = async () => {
  avatarModalOpen.value = true
  await loadAvatarPictures(1)
}

const changeAvatarPage = async (page: number) => {
  await loadAvatarPictures(page)
}

const selectAvatarPicture = (picture: API.PictureVO) => {
  cropSourceUrl.value = picture.url ?? picture.thumbnailUrl ?? ''
  avatarModalOpen.value = false
  cropModalOpen.value = true
}

const closeCropModal = () => {
  cropModalOpen.value = false
  cropSourceUrl.value = ''
}

const confirmCrop = async () => {
  if (!cropperRef.value) {
    return
  }
  cropUploading.value = true
  try {
    const blob = await new Promise<Blob>((resolve) => {
      cropperRef.value.getCropBlob((result: Blob) => resolve(result))
    })
    const file = new File([blob], 'avatar.png', { type: blob.type || 'image/png' })
    const res = await uploadUserAvatarUsingPost(file)
    if (res.data.code === 200 && res.data.data) {
      profileForm.userAvatar = res.data.data
      cropModalOpen.value = false
      cropSourceUrl.value = ''
      message.success('头像裁剪上传成功')
      return
    }
    message.error(`头像上传失败：${res.data.message ?? '未知错误'}`)
  } catch (error) {
    console.error('头像上传失败', error)
    message.error('头像上传失败，请稍后重试')
  } finally {
    cropUploading.value = false
  }
}

const clearAvatar = () => {
  profileForm.userAvatar = ''
}

const saveProfile = async () => {
  profileLoading.value = true
  try {
    const res = await updateMyUserUsingPost({
      userName: profileForm.userName?.trim(),
      userAvatar: profileForm.userAvatar?.trim(),
      userProfile: profileForm.userProfile?.trim(),
    })
    if (res.data.code === 200 && res.data.data) {
      message.success('个人资料已更新')
      await loginUserStore.fetchLoginUser()
      syncProfileForm()
      await router.push('/')
      return
    }
    message.error(`更新失败：${res.data.message ?? '未知错误'}`)
  } finally {
    profileLoading.value = false
  }
}

const savePassword = async () => {
  if (passwordForm.newPassword !== passwordForm.checkPassword) {
    message.error('两次输入的新密码不一致')
    return
  }
  passwordLoading.value = true
  try {
    const res = await updateMyUserPasswordUsingPost({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
      checkPassword: passwordForm.checkPassword,
    })
    if (res.data.code === 200 && res.data.data) {
      await userLogoutUsingPost()
      loginUserStore.setLoginUser({ userName: '未登录' })
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.checkPassword = ''
      message.success('密码修改成功，请重新登录')
      await router.replace('/user/login')
      return
    }
    message.error(`修改失败：${res.data.message ?? '未知错误'}`)
  } finally {
    passwordLoading.value = false
  }
}
</script>

<style scoped>
#userProfilePage {
  min-height: 0;
}

.profile-scroll {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding-bottom: 16px;
}

.avatar-tip {
  color: #888;
  font-size: 13px;
}

.avatar-picture-card {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
}

.avatar-picture-card:hover {
  border-color: #1677ff;
  box-shadow: 0 8px 24px rgba(22, 119, 255, 0.12);
}

.avatar-picture-image {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.avatar-picture-name {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.4;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.cropper-wrapper {
  height: 420px;
}

.avatar-cropper-modal :deep(.vue-cropper) {
  height: 420px !important;
  width: 100%;
}

.cropper-tip {
  margin-top: 12px;
  color: #888;
  font-size: 13px;
}
</style>
