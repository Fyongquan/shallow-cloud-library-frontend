import axios from 'axios'
import { message } from 'ant-design-vue'
import { isLoginCheckRequest, notifyAndRedirectToLogin } from '@/utils/auth'

const myAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 10000,
  withCredentials: true,
})

const getRequestUrl = (responseOrError: any) => {
  const responseUrl = responseOrError?.request?.responseURL ?? ''
  if (responseUrl) {
    return responseUrl
  }
  return responseOrError?.config?.url ?? ''
}

myAxios.interceptors.request.use(
  function (config) {
    const baseURL = String(config.baseURL ?? '').replace(/\/+$/, '')
    const requestUrl = config.url

    // Prevent duplicated "/api/api" when generated API paths already include "/api".
    if (typeof requestUrl === 'string' && baseURL.endsWith('/api') && /^\/api(\/|$)/.test(requestUrl)) {
      const normalizedUrl = requestUrl.replace(/^\/api(?=\/|$)/, '')
      config.url = normalizedUrl || '/'
    }

    return config
  },
  function (error) {
    return Promise.reject(error)
  },
)

myAxios.interceptors.response.use(
  function (response) {
    const { data } = response
    const requestUrl = getRequestUrl(response)
    const businessCode = Number(data?.code)

    if (businessCode === 401 || businessCode === 40100) {
      notifyAndRedirectToLogin(requestUrl)
      return response
    }

    if (businessCode && businessCode !== 200) {
      if (!isLoginCheckRequest(requestUrl)) {
        message.error(data.message || '\u8bf7\u6c42\u5931\u8d25')
      }
    }

    return response
  },
  function (error) {
    const response = error?.response
    const status = response?.status
    const requestUrl = getRequestUrl(response || error)
    const backendMessage = response?.data?.message
    const businessCode = Number(response?.data?.code)

    if (businessCode === 401 || businessCode === 40100 || status === 401) {
      notifyAndRedirectToLogin(requestUrl)
      return Promise.reject(error)
    }

    if (status === 403) {
      message.error(backendMessage || '\u6ca1\u6709\u6743\u9650')
      return Promise.reject(error)
    }

    if (status === 503) {
      message.error(backendMessage || '\u670d\u52a1\u4e0d\u53ef\u7528\uff0c\u8bf7\u68c0\u67e5\u540e\u7aef\u670d\u52a1')
      return Promise.reject(error)
    }

    if (backendMessage && !isLoginCheckRequest(requestUrl)) {
      message.error(backendMessage)
    }

    return Promise.reject(error)
  },
)

export default myAxios
