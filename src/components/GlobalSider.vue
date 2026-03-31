<template>
  <div id="globalSider">
    <a-layout-sider
      v-if="loginUserStore.loginUser.id"
      width="200"
      breakpoint="lg"
      collapsed-width="0"
    >
      <a-menu
        v-model:selectedKeys="current"
        mode="inline"
        :items="menuItems"
        @click="doMenuClick"
      />
    </a-layout-sider>
  </div>
</template>

<script lang="ts" setup>
import { computed, h, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import {
  BellOutlined,
  CrownOutlined,
  HeartOutlined,
  PictureOutlined,
  RobotOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { SPACE_TYPE_ENUM } from '@/constants/space.ts'
import { listMyTeamSpaceUsingPost } from '@/api/spaceUserController.ts'
import { listSpaceVoByPageUsingPost } from '@/api/spaceController.ts'
import { message } from 'ant-design-vue'

const loginUserStore = useLoginUserStore()
const router = useRouter()
const route = useRoute()

const teamSpaceList = ref<API.SpaceUserVO[]>([])
const privateSpaceId = ref<string>('')
const current = ref<string[]>([])

const fixedMenuItems = [
  {
    key: '/',
    icon: () => h(PictureOutlined),
    label: '公共图库',
  },
  {
    key: '/my_space',
    icon: () => h(UserOutlined),
    label: '我的空间',
  },
  {
    key: '/my_favor',
    icon: () => h(HeartOutlined),
    label: '我的收藏',
  },
  {
    key: '/user/messages',
    icon: () => h(BellOutlined),
    label: '消息中心',
  },
  {
    key: '/user/ai-assistant',
    icon: () => h(RobotOutlined),
    label: 'AI助手',
  },
  {
    key: '/user_exchange_vip',
    icon: () => h(CrownOutlined),
    label: '会员商城',
  },
  {
    key: '/add_space',
    icon: () => h(TeamOutlined),
    label: '创建团队',
  },
]

const validTeamSpaceList = computed(() => {
  return teamSpaceList.value.filter((spaceUser) => {
    return Boolean(spaceUser.spaceId && spaceUser.space?.spaceName)
  })
})

const menuItems = computed(() => {
  if (validTeamSpaceList.value.length < 1) {
    return fixedMenuItems
  }

  const teamSpaceSubMenus = validTeamSpaceList.value.map((spaceUser) => {
    const space = spaceUser.space
    return {
      key: '/space/' + spaceUser.spaceId,
      label: space?.spaceName,
    }
  })

  const teamSpaceMenuGroup = {
    type: 'group',
    label: '我的团队',
    key: 'teamSpace',
    children: teamSpaceSubMenus,
  }

  return [...fixedMenuItems, teamSpaceMenuGroup]
})

const resolveActiveMenuKey = () => {
  const path = route.path

  if (path === '/my_space') {
    return '/my_space'
  }

  if (privateSpaceId.value && path === `/space/${privateSpaceId.value}`) {
    return '/my_space'
  }

  if (path === '/add_space') {
    return '/add_space'
  }

  return path
}

const updateCurrentMenu = () => {
  current.value = [resolveActiveMenuKey()]
}

const fetchTeamSpaceList = async () => {
  try {
    const res = await listMyTeamSpaceUsingPost()
    if (res.data.code === 200 && res.data.data) {
      teamSpaceList.value = res.data.data
    } else {
      message.error('加载我的团队空间失败：' + res.data.message)
    }
  } catch (error) {
    // 已由全局请求拦截器处理
  }
}

const fetchPrivateSpaceId = async () => {
  const loginUser = loginUserStore.loginUser
  if (!loginUser?.id) {
    privateSpaceId.value = ''
    return
  }

  try {
    const res = await listSpaceVoByPageUsingPost({
      userId: loginUser.id,
      current: 1,
      pageSize: 1,
      spaceType: SPACE_TYPE_ENUM.PRIVATE,
    })

    if (res.data.code === 200) {
      privateSpaceId.value = res.data.data?.records?.[0]?.id
        ? String(res.data.data.records[0].id)
        : ''
      return
    }

    privateSpaceId.value = ''
  } catch (error) {
    privateSpaceId.value = ''
  }
}

const handleTeamSpaceUpdated = () => {
  if (!loginUserStore.loginUser.id) {
    return
  }
  fetchTeamSpaceList()
}

watchEffect(() => {
  if (loginUserStore.loginUser.id) {
    fetchTeamSpaceList()
    fetchPrivateSpaceId()
    updateCurrentMenu()
  } else {
    teamSpaceList.value = []
    privateSpaceId.value = ''
    current.value = []
  }
})

watch(
  () => route.fullPath,
  () => {
    updateCurrentMenu()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('team-space-updated', handleTeamSpaceUpdated)
})

onBeforeUnmount(() => {
  window.removeEventListener('team-space-updated', handleTeamSpaceUpdated)
})

const doMenuClick = ({ key }: { key: string }) => {
  if (key === '/add_space') {
    router.push({
      path: '/add_space',
      query: {
        type: String(SPACE_TYPE_ENUM.TEAM),
      },
    })
    return
  }
  router.push(key)
}
</script>

<style scoped>
#globalSider {
  height: 100%;
}

#globalSider .ant-layout-sider {
  background: none;
  height: 100%;
}

#globalSider :deep(.ant-layout-sider-children) {
  height: 100%;
}

#globalSider :deep(.ant-menu) {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
