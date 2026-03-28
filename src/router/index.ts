import { createRouter, createWebHistory } from 'vue-router'
import { message } from 'ant-design-vue'
import HomePage from '@/pages/HomePage.vue'
import UserLoginPage from '@/pages/user/UserLoginPage.vue'
import UserProfileCenterPage from '@/pages/user/UserProfileCenterPage.vue'
import UserRegisterPage from '@/pages/user/UserRegisterPage.vue'
import UserManagePage from '@/pages/admin/UserManagePage.vue'
import AddPicturePage from '@/pages/AddPicturePage.vue'
import PictureManagePage from '@/pages/admin/PictureManagePage.vue'
import PlatformOverviewPage from '@/pages/admin/PlatformOverviewPage.vue'
import PictureDetailPage from '@/pages/PictureDetailPage.vue'
import AddPictureBatchPage from '@/pages/AddPictureBatchPage.vue'
import SpaceManagePage from '@/pages/admin/SpaceManagePage.vue'
import AddSpacePage from '@/pages/AddSpacePage.vue'
import MySpacePage from '@/pages/MySpacePage.vue'
import SpaceDetailPage from '@/pages/SpaceDetailPage.vue'
import SearchPicturePage from '@/pages/SearchPicturePage.vue'
import SpaceAnalyzePage from '@/pages/SpaceAnalyzePage.vue'
import SpaceUserManagePage from '@/pages/admin/SpaceUserManagePage.vue'
import UserExchangeVipPage from '@/pages/UserExchangeVipPage.vue'
import UserMessagePage from '@/pages/user/UserMessagePage.vue'
import UserAiAssistantPage from '@/pages/user/UserAiAssistantPage.vue'
import MyFavorPage from '@/pages/MyFavorPage.vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { getLoginUserUsingGet } from '@/api/userController'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/user/login',
      name: '用户登录',
      component: UserLoginPage,
    },
    {
      path: '/user/register',
      name: '用户注册',
      component: UserRegisterPage,
    },
    {
      path: '/user/profile',
      name: '个人中心',
      component: UserProfileCenterPage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/user/messages',
      name: '消息中心',
      component: UserMessagePage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/user/ai-assistant',
      name: 'AI助手',
      component: UserAiAssistantPage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/admin/userManage',
      name: '用户管理',
      component: UserManagePage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/admin/pictureManage',
      name: '图片管理',
      component: PictureManagePage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/admin/spaceManage',
      name: '空间管理',
      component: SpaceManagePage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/admin/platformOverview',
      name: '平台总览',
      component: PlatformOverviewPage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/spaceUserManage/:id',
      name: '空间成员管理',
      component: SpaceUserManagePage,
      props: true,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/add_picture',
      name: '上传图片',
      component: AddPicturePage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/add_picture/batch',
      name: '批量创建图片',
      component: AddPictureBatchPage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/picture/:id',
      name: '图片详情',
      component: PictureDetailPage,
      props: true,
    },
    {
      path: '/add_space',
      name: '创建空间',
      component: AddSpacePage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/my_space',
      name: '我的空间',
      component: MySpacePage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/my_favor',
      name: '我的收藏',
      component: MyFavorPage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/space/:id',
      name: '空间详情',
      component: SpaceDetailPage,
      props: true,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/space_analyze',
      name: '空间分析',
      component: SpaceAnalyzePage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/search_picture',
      name: '图片搜索',
      component: SearchPicturePage,
    },
    {
      path: '/user_exchange_vip',
      name: '用户兑换会员',
      component: UserExchangeVipPage,
      meta: {
        requireLogin: true,
      },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

const isAdminPath = (path: string) => path.startsWith('/admin')
const PUBLIC_PATH_SET = new Set(['/user/login', '/user/register', '/about'])

const fetchLoginUser = async () => {
  const loginUserStore = useLoginUserStore()
  try {
    const res = await getLoginUserUsingGet()
    if (Number(res.data?.code) === 200 && res.data?.data?.id) {
      loginUserStore.setLoginUser(res.data.data)
      return res.data.data
    }
  } catch {
    // ignore and treat as anonymous
  }
  loginUserStore.setLoginUser({ userName: '未登录' })
  return null
}

router.beforeEach(async (to, _from, next) => {
  const requireLogin = Boolean(to.meta?.requireLogin) || !PUBLIC_PATH_SET.has(to.path)
  const loginUser = await fetchLoginUser()

  if (requireLogin && !loginUser?.id) {
    message.warning('请先登录')
    next(`/user/login?redirect=${to.fullPath}`)
    return
  }

  if (isAdminPath(to.fullPath)) {
    if (!loginUser?.id) {
      message.warning('请先登录')
      next(`/user/login?redirect=${to.fullPath}`)
      return
    }
    if (loginUser.userRole !== 'admin') {
      message.error('没有权限')
      next(`/user/login?redirect=${to.fullPath}`)
      return
    }
  }

  next()
})

export default router
