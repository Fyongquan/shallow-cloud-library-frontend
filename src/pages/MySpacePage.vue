<template>
  <div id="mySpacePage">
    <p>正在跳转，请稍后...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { listSpaceVoByPageUsingPost } from '@/api/spaceController.ts'
import { SPACE_TYPE_ENUM } from '@/constants/space.ts'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()

const checkUserSpace = async () => {
  const loginUser = loginUserStore.loginUser
  if (!loginUser?.id) {
    await router.replace('/user/login')
    return
  }

  const res = await listSpaceVoByPageUsingPost({
    userId: loginUser.id,
    current: 1,
    pageSize: 1,
    spaceType: SPACE_TYPE_ENUM.PRIVATE,
  })

  if (res.data.code !== 200) {
    message.error('加载我的空间失败：' + res.data.message)
    return
  }

  const space = res.data.data?.records?.[0]
  if (!space?.id) {
    message.warn('请先创建空间')
    await router.replace('/add_space')
    return
  }

  if (route.query.uploadToPublic === '1') {
    await router.replace({
      path: '/add_picture',
      query: {
        spaceId: String(space.id),
        syncPublic: '1',
        from: `/space/${space.id}`,
      },
    })
    return
  }

  await router.replace(`/space/${space.id}`)
}

onMounted(() => {
  checkUserSpace()
})
</script>
