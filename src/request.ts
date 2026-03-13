import axios from 'axios'
import { message } from 'ant-design-vue'

const myAxios = axios.create({
  baseURL: '',
  timeout: 10000,
  withCredentials: true,
})

const isLoginPage = () => window.location.pathname.includes('/user/login')

const isLoginCheckRequest = (url: string) => {
  return url.includes('user/get/login')
}

const redirectToLogin = () => {
  window.location.href = `/user/login?redirect=${window.location.href}`
}

myAxios.interceptors.request.use(
  function (config) {
    return config
  },
  function (error) {
    return Promise.reject(error)
  },
)

myAxios.interceptors.response.use(
  function (response) {
    const { data } = response
    const responseURL = response?.request?.responseURL ?? ''

    if (data?.code === 40100) {
      if (!isLoginCheckRequest(responseURL) && !isLoginPage()) {
        message.warning('请先登录')
        redirectToLogin()
      }
      return response
    }

    if (data?.code && data.code !== 200) {
      if (!isLoginCheckRequest(responseURL)) {
        message.error(data.message || '请求失败')
      }
    }

    return response
  },
  function (error) {
    const response = error?.response
    const status = response?.status
    const responseURL = response?.request?.responseURL ?? ''
    const backendMessage = response?.data?.message

    if (status === 401 && !isLoginCheckRequest(responseURL) && !isLoginPage()) {
      message.warning('请先登录')
      redirectToLogin()
      return Promise.reject(error)
    }

    if (status === 403) {
      message.error(backendMessage || '没有权限')
      return Promise.reject(error)
    }

    if (status === 503) {
      message.error(backendMessage || '服务不可用，请检查后端服务')
      return Promise.reject(error)
    }

    if (backendMessage && !isLoginCheckRequest(responseURL)) {
      message.error(backendMessage)
    }

    return Promise.reject(error)
  },
)

export default myAxios
