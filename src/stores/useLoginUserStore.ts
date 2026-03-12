import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getLoginUserUsingGet } from '@/api/userController.ts'

export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>({
    userName: '未登录',
  })

  async function fetchLoginUser() {
    try {
      const res = await getLoginUserUsingGet()
      if (res.data.code === 200 && res.data.data) {
        loginUser.value = res.data.data
        return
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        throw error
      }
    }

    loginUser.value = {
      userName: '未登录',
    }
  }

  function setLoginUser(newLoginUser: any) {
    loginUser.value = newLoginUser
  }

  return { loginUser, fetchLoginUser, setLoginUser }
})
