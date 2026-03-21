<template>
  <div id="globalHeader">
    <a-row :wrap="false">
      <a-col flex="200px">
        <router-link to="/">
          <div class="title-bar">
            <img class="logo" src="../assets/logo.png" alt="logo" />
            <div class="title">浅度云图库</div>
          </div>
        </router-link>
      </a-col>
      <a-col flex="auto">
        <a-menu v-model:selectedKeys="current" mode="horizontal" :items="items" @click="doMenuClick" />
      </a-col>
      <a-col flex="220px">
        <div class="user-login-status">
          <div v-if="loginUserStore.loginUser.id" class="user-login-block">
            <a-badge :dot="unreadCount > 0" :offset="[-2, 2]">
              <BellOutlined class="message-icon" @click="goMessageCenter" />
            </a-badge>
            <a-dropdown>
              <a-space class="user-dropdown-trigger">
                <a-avatar :src="loginUserStore.loginUser.userAvatar" />
                <span class="user-name" :title="loginUserStore.loginUser.userName ?? '无名'">
                  {{ loginUserStore.loginUser.userName ?? '无名' }}
                </span>
              </a-space>
              <template #overlay>
                <a-menu>
                  <a-menu-item>
                    <router-link to="/user/profile">
                      <UserOutlined />
                      个人中心
                    </router-link>
                  </a-menu-item>
                  <a-menu-item>
                    <router-link to="/user/messages">
                      <BellOutlined />
                      消息中心
                    </router-link>
                  </a-menu-item>
                  <a-menu-item>
                    <router-link to="/user/ai-assistant">
                      <RobotOutlined />
                      AI助手
                    </router-link>
                  </a-menu-item>
                  <a-menu-item>
                    <router-link to="/user_exchange_vip">
                      <CrownOutlined />
                      会员商城
                    </router-link>
                  </a-menu-item>
                  <a-menu-item>
                    <router-link to="/my_space">
                      <UserOutlined />
                      我的空间
                    </router-link>
                  </a-menu-item>
                  <a-menu-item @click="doLogout">
                    <LogoutOutlined />
                    退出登录
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
          <div v-else>
            <a-button type="primary" @click="router.push('/user/login')">登录</a-button>
          </div>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
import { computed, h, onUnmounted, ref, watch } from 'vue'
import {
  BellOutlined,
  CrownOutlined,
  HomeOutlined,
  LogoutOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { MenuProps } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { userLogoutUsingPost } from '@/api/userController.ts'
import { countUnreadMessageUsingGet } from '@/api/messageController.ts'

const loginUserStore = useLoginUserStore()

const originItems = [
  {
    key: '/',
    icon: () => h(HomeOutlined),
    label: '首页',
    title: '首页',
  },
  {
    key: '/admin/userManage',
    label: '用户管理',
    title: '用户管理',
  },
  {
    key: '/admin/pictureManage',
    label: '图片管理',
    title: '图片管理',
  },
  {
    key: '/admin/spaceManage',
    label: '空间管理',
    title: '空间管理',
  },
]

const filterMenus = (menus = [] as MenuProps['items']) => {
  return menus?.filter((menu) => {
    if (menu?.key?.startsWith('/admin')) {
      const loginUser = loginUserStore.loginUser
      if (!loginUser || loginUser.userRole !== 'admin') {
        return false
      }
    }
    return true
  })
}

const items = computed(() => filterMenus(originItems))

const router = useRouter()
const current = ref<string[]>([])

router.afterEach((to) => {
  current.value = [to.path]
})

const doMenuClick = ({ key }: { key: string }) => {
  router.push({
    path: key,
  })
}

const unreadCount = ref(0)
let unreadTimer: ReturnType<typeof setInterval> | null = null

const normalizeUnreadCount = (value: unknown) => {
  const count = Number(value)
  if (!Number.isFinite(count) || count <= 0) {
    return 0
  }
  return Math.floor(count)
}

const stopUnreadPolling = () => {
  if (unreadTimer) {
    clearInterval(unreadTimer)
    unreadTimer = null
  }
}

const fetchUnreadCount = async () => {
  if (!loginUserStore.loginUser.id) {
    unreadCount.value = 0
    return
  }
  try {
    const res = await countUnreadMessageUsingGet()
    if (res.data.code === 200) {
      unreadCount.value = normalizeUnreadCount(res.data.data)
      return
    }
    unreadCount.value = 0
  } catch {
    unreadCount.value = 0
  }
}

const startUnreadPolling = () => {
  stopUnreadPolling()
  fetchUnreadCount()
  unreadTimer = setInterval(fetchUnreadCount, 20000)
}

watch(
  () => loginUserStore.loginUser.id,
  (id) => {
    if (id) {
      startUnreadPolling()
    } else {
      stopUnreadPolling()
      unreadCount.value = 0
    }
  },
  { immediate: true },
)

const goMessageCenter = async () => {
  unreadCount.value = 0
  await router.push('/user/messages')
}

const doLogout = async () => {
  const res = await userLogoutUsingPost()
  if (res.data.code === 200) {
    loginUserStore.setLoginUser({
      userName: '未登录',
    })
    unreadCount.value = 0
    stopUnreadPolling()
    message.success('退出登录成功')
    await router.push('/user/login')
  } else {
    message.error('退出登录失败，' + res.data.message)
  }
}

onUnmounted(() => {
  stopUnreadPolling()
})
</script>

<style scoped>
#globalHeader .title-bar {
  display: flex;
  align-items: center;
}

.title {
  color: black;
  font-size: 18px;
  margin-left: 16px;
}

.logo {
  height: 48px;
}

.user-login-status {
  display: flex;
  justify-content: flex-end;
}

.user-login-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.message-icon {
  font-size: 20px;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
}

.user-dropdown-trigger {
  max-width: 100%;
  cursor: pointer;
}

.user-name {
  display: inline-block;
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>
