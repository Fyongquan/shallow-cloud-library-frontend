import router from '@/router'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import { message } from 'ant-design-vue'

let firstFetchLoginUser = true

const isUnauthorizedCode = (code?: number) => code === 401 || code === 40100

const ensureLoginUser = async (force = false) => {
  const loginUserStore = useLoginUserStore()
  if (!force && !firstFetchLoginUser) {
    return loginUserStore.loginUser
  }

  try {
    await loginUserStore.fetchLoginUser()
  } catch (error: any) {
    const status = Number(error?.response?.status)
    const code = Number(error?.response?.data?.code)
    if (status !== 401 && !isUnauthorizedCode(code)) {
      throw error
    }
    loginUserStore.setLoginUser({
      userName: '\u672a\u767b\u5f55',
    })
  }

  firstFetchLoginUser = false
  return loginUserStore.loginUser
}

router.beforeEach(async (to, from, next) => {
  let loginUser = await ensureLoginUser()

  if (to.meta?.requireLogin) {
    // 受保护路由每次进入都校验一次，避免本地缓存登录态与后端实际登录态不一致
    loginUser = await ensureLoginUser(true)
    if (!loginUser?.id) {
      message.warning('\u8bf7\u5148\u767b\u5f55')
      next(`/user/login?redirect=${to.fullPath}`)
      return
    }
  }

  const toUrl = to.fullPath
  if (toUrl.startsWith('/admin')) {
    if (!loginUser || loginUser.userRole !== 'admin') {
      message.error('\u6ca1\u6709\u6743\u9650')
      next(`/user/login?redirect=${to.fullPath}`)
      return
    }
  }

  next()
})
