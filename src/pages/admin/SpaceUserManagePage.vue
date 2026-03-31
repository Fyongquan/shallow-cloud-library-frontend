<template>
  <div id="spaceManagePage" class="page-shell">
    <a-flex justify="space-between" align="center" wrap="wrap" gap="middle">
      <h2>空间成员管理</h2>
      <a-space wrap>
        <a-button type="primary" href="/add_space">+ 创建空间</a-button>
        <a-button type="primary" ghost href="/space_analyze?queryPublic=1"> 分析公共图库 </a-button>
        <a-button type="primary" ghost href="/space_analyze?queryAll=1"> 分析全部空间 </a-button>
      </a-space>
    </a-flex>

    <div style="margin-bottom: 16px" />

    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 16px"
      message="添加成员后会先发送邀请，对方需要在消息中心同意后才会真正加入团队空间。"
    />

    <a-form layout="inline" :model="formData" @finish="handleSubmit">
      <a-form-item label="用户 ID" name="userId">
        <a-input v-model:value="formData.userId" placeholder="请输入要邀请的用户 ID" allow-clear />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit">发送邀请</a-button>
      </a-form-item>
    </a-form>

    <div style="margin-bottom: 16px" />

    <a-table class="data-table" :columns="columns" :data-source="dataList" row-key="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'userInfo'">
          <a-space>
            <a-avatar :src="record.user?.userAvatar" />
            <span>{{ record.user?.userName || '未命名用户' }}</span>
          </a-space>
        </template>
        <template v-else-if="column.dataIndex === 'spaceRole'">
          <a-select
            v-model:value="record.spaceRole"
            :options="SPACE_ROLE_OPTIONS"
            @change="(value) => editSpaceRole(value, record)"
          />
        </template>
        <template v-else-if="column.dataIndex === 'createTime'">
          {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space wrap>
            <a-button
              v-if="canRemoveMember(record)"
              type="link"
              danger
              @click="doDelete(record.id)"
            >
              移除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { SPACE_ROLE_ENUM, SPACE_ROLE_OPTIONS } from '@/constants/space'
import {
  addSpaceUserUsingPost,
  deleteSpaceUserUsingPost,
  editSpaceUserUsingPost,
  listSpaceUserUsingPost,
} from '@/api/spaceUserController'
import { toIdString } from '@/utils/id'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

interface Props {
  id: string
}

const props = defineProps<Props>()
const loginUserStore = useLoginUserStore()

const columns = [
  {
    title: '用户',
    dataIndex: 'userInfo',
  },
  {
    title: '角色',
    dataIndex: 'spaceRole',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
  },
  {
    title: '操作',
    key: 'action',
  },
]

const dataList = ref<API.SpaceUserVO[]>([])
const formData = reactive<API.SpaceUserAddRequest>({
  userId: undefined,
})

const fetchData = async () => {
  const spaceId = toIdString(props.id)
  if (!spaceId) {
    return
  }
  const res = await listSpaceUserUsingPost({
    spaceId: spaceId as any,
  })
  if (res.data.code === 200 && res.data.data) {
    dataList.value = res.data.data ?? []
  } else {
    message.error(`获取成员数据失败：${res.data.message}`)
  }
}

onMounted(() => {
  fetchData()
})

const handleSubmit = async () => {
  const spaceId = toIdString(props.id)
  const userId = toIdString(formData.userId)
  if (!spaceId || !userId) {
    message.warning('请输入有效的用户 ID')
    return
  }
  const res = await addSpaceUserUsingPost({
    spaceId: spaceId as any,
    userId: userId as any,
  })
  if (res.data.code === 200) {
    message.success('邀请已发送，对方同意后会加入空间')
    formData.userId = undefined
    await fetchData()
  } else {
    message.error(`发送邀请失败：${res.data.message}`)
  }
}

const editSpaceRole = async (value: string, record: API.SpaceUserVO) => {
  const id = toIdString(record.id)
  if (!id) {
    message.error('成员记录 id 无效')
    return
  }
  const res = await editSpaceUserUsingPost({
    id: id as any,
    spaceRole: value,
  })
  if (res.data.code === 200) {
    message.success('成员角色修改成功')
  } else {
    message.error(`成员角色修改失败：${res.data.message}`)
  }
}

const doDelete = async (id?: string) => {
  const memberId = toIdString(id)
  if (!memberId) {
    return
  }
  const res = await deleteSpaceUserUsingPost({ id: memberId as any })
  if (res.data.code === 200) {
    message.success('成员移除成功')
    await fetchData()
  } else {
    message.error('成员移除失败')
  }
}

const canRemoveMember = (record: API.SpaceUserVO) => {
  const currentUserId = toIdString(loginUserStore.loginUser.id)
  if (!currentUserId) {
    return false
  }
  const currentMember = dataList.value.find(
    (item) => toIdString(item.userId) === currentUserId,
  )
  if (!currentMember || currentMember.spaceRole !== SPACE_ROLE_ENUM.ADMIN) {
    return false
  }
  return toIdString(record.userId) !== currentUserId
}
 </script>

<style scoped>
#spaceManagePage {
  min-height: 0;
}

#spaceManagePage .data-table {
  flex: 1;
  min-height: 0;
}

#spaceManagePage :deep(.ant-spin-nested-loading),
#spaceManagePage :deep(.ant-spin-container),
#spaceManagePage :deep(.ant-table-wrapper) {
  height: 100%;
  min-height: 0;
}

#spaceManagePage :deep(.ant-table-wrapper) {
  overflow: auto;
}
</style>
