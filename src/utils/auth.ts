import { message } from 'ant-design-vue'

const LOGIN_PATH = '/user/login'
let redirectingToLogin = false
let lastLoginWarningAt = 0

const normalizeRequestPath = (url?: string) => {
  if (!url) {
    return ''
  }
  try {
    const parsed = new URL(url, window.location.origin)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

export const isLoginPage = () => window.location.pathname.startsWith(LOGIN_PATH)

export const isLoginCheckRequest = (url?: string) => {
  const path = normalizeRequestPath(url)
  return path.includes('/api/user/get/login') || path.includes('/user/get/login')
}

export const redirectToLogin = (redirectUrl = window.location.href) => {
  if (redirectingToLogin || isLoginPage()) {
    return
  }
  redirectingToLogin = true
  const encodedRedirect = encodeURIComponent(redirectUrl)
  window.location.href = `${LOGIN_PATH}?redirect=${encodedRedirect}`
  window.setTimeout(() => {
    redirectingToLogin = false
  }, 1500)
}

export const notifyAndRedirectToLogin = (requestUrl?: string) => {
  if (isLoginPage() || isLoginCheckRequest(requestUrl)) {
    return false
  }
  const now = Date.now()
  if (now - lastLoginWarningAt > 1000) {
    message.warning('\u8bf7\u5148\u767b\u5f55')
    lastLoginWarningAt = now
  }
  redirectToLogin()
  return true
}
