import router from '@/router'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { message } from 'ant-design-vue'

let firstFetchLoginUser = true

const ensureLoginUser = async (force = false) => {
  const loginUserStore = useLoginUserStore()
  if (!force && !firstFetchLoginUser) {
    return loginUserStore.loginUser
  }

  try {
    await loginUserStore.fetchLoginUser()
  } catch (error: any) {
    if (error?.response?.status !== 401) {
      throw error
    }
    loginUserStore.setLoginUser({
      userName: '未登录',
    })
  }

  firstFetchLoginUser = false
  return loginUserStore.loginUser
}

router.beforeEach(async (to, from, next) => {
  let loginUser = await ensureLoginUser()

  if (to.meta?.requireLogin && !loginUser?.id) {
    loginUser = await ensureLoginUser(true)
    if (!loginUser?.id) {
      message.warning('请先登录')
      next(`/user/login?redirect=${to.fullPath}`)
      return
    }
  }

  const toUrl = to.fullPath
  if (toUrl.startsWith('/admin')) {
    if (!loginUser || loginUser.userRole !== 'admin') {
      message.error('没有权限')
      next(`/user/login?redirect=${to.fullPath}`)
      return
    }
  }

  next()
})
