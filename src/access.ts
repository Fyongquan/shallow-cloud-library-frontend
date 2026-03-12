import router from '@/router'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { message } from 'ant-design-vue'

let firstFetchLoginUser = true

router.beforeEach(async (to, from, next) => {
  const loginUserStore = useLoginUserStore()
  let loginUser = loginUserStore.loginUser

  if (firstFetchLoginUser) {
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
    loginUser = loginUserStore.loginUser
    firstFetchLoginUser = false
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
