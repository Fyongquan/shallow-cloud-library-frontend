import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getLoginUserUsingGet } from '@/api/userController.ts'

const isUnauthorizedCode = (code?: number) => code === 401 || code === 40100

export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>({
    userName: '\u672a\u767b\u5f55',
  })

  async function fetchLoginUser() {
    try {
      const res = await getLoginUserUsingGet()
      const code = Number(res.data?.code)
      if (code === 200 && res.data.data) {
        loginUser.value = res.data.data
        return
      }
      if (isUnauthorizedCode(code)) {
        loginUser.value = {
          userName: '\u672a\u767b\u5f55',
        }
        return
      }
    } catch (error: any) {
      const status = Number(error?.response?.status)
      const code = Number(error?.response?.data?.code)
      if (status !== 401 && !isUnauthorizedCode(code)) {
        throw error
      }
    }

    loginUser.value = {
      userName: '\u672a\u767b\u5f55',
    }
  }

  function setLoginUser(newLoginUser: any) {
    loginUser.value = newLoginUser
  }

  return { loginUser, fetchLoginUser, setLoginUser }
})
