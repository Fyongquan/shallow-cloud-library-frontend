<template>
  <div id="userProfilePage">
    <a-card title="个人中心" :bordered="false">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="profile" tab="资料设置">
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
                    <a-button type="primary" @click="openAvatarModal">从我的图片选择</a-button>
                    <a-button @click="clearAvatar">清空头像</a-button>
                  </a-space>
                </a-space>
                <div class="avatar-tip">
                  头像将从你自己上传的图片中选择，不再手动填写图片地址。
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
            type="info"
            show-icon
            message="修改密码后不会自动退出登录，下次登录请使用新密码。"
            style="margin-bottom: 16px"
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
              <div
                class="avatar-picture-card"
                :class="{ selected: profileForm.userAvatar === (picture.thumbnailUrl ?? picture.url) }"
                @click="selectAvatar(picture)"
              >
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import {
  updateMyUserPasswordUsingPost,
  updateMyUserUsingPost,
} from '@/api/userController'
import { listMyPictureVoByPageUsingPost } from '@/api/pictureController'

const loginUserStore = useLoginUserStore()
const activeTab = ref('profile')
const profileLoading = ref(false)
const passwordLoading = ref(false)
const avatarModalOpen = ref(false)
const avatarLoading = ref(false)
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
    message.error(`加载头像图片失败，${res.data.message}`)
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

const selectAvatar = (picture: API.PictureVO) => {
  profileForm.userAvatar = picture.url ?? picture.thumbnailUrl ?? ''
  avatarModalOpen.value = false
  message.success('已选择头像图片')
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
      return
    }
    message.error(`更新失败，${res.data.message}`)
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
      message.success('密码修改成功')
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.checkPassword = ''
      activeTab.value = 'profile'
      return
    }
    message.error(`修改失败，${res.data.message}`)
  } finally {
    passwordLoading.value = false
  }
}
</script>

<style scoped>
#userProfilePage {
  max-width: 720px;
  margin: 0 auto;
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

.avatar-picture-card.selected {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15);
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
</style>
