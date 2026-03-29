<template>
  <div id="spaceDetailPage">
    <a-flex justify="space-between" align="start" wrap="wrap" :gap="16">
      <h2>{{ space.spaceName }}（{{ SPACE_TYPE_MAP[space.spaceType ?? 0] }}）</h2>
      <a-space size="middle" wrap>
        <a-button
          v-if="canUploadPicture"
          type="primary"
          @click="router.push(`/add_picture?spaceId=${id}&from=/space/${id}`)"
        >
          + 上传图片
        </a-button>
        <a-button
          v-if="canUploadPicture"
          type="primary"
          :icon="h(BulbOutlined)"
          @click="doTextGenerate"
        >
          AI 生图
        </a-button>
        <a-button
          v-if="showSpaceUserManage"
          type="primary"
          ghost
          :icon="h(TeamOutlined)"
          @click="router.push(`/spaceUserManage/${id}`)"
        >
          成员管理
        </a-button>
        <a-button
          v-if="canManageSpaceUser"
          type="primary"
          ghost
          :icon="h(BarChartOutlined)"
          @click="router.push(`/space_analyze?spaceId=${id}`)"
        >
          空间分析
        </a-button>
        <a-button v-if="canEditPicture" :icon="h(EditOutlined)" @click="doBatchEdit">
          批量编辑
        </a-button>
        <a-tooltip
          v-if="canUpgradeSpace"
          placement="bottom"
          :get-popup-container="getTooltipContainer"
          :title="canUpgradeToNextLevel ? `升级到 ${nextSpaceLevelText}` : '当前已是最高等级'"
        >
          <a-button :loading="upgradeLoading" :disabled="!canUpgradeToNextLevel" @click="doUpgradeSpace">
            升级空间
          </a-button>
        </a-tooltip>
        <a-tooltip
          placement="bottomLeft"
          :get-popup-container="getTooltipContainer"
          :title="spaceUsageTooltip"
        >
          <a-progress
            type="circle"
            :size="42"
            :percent="space.maxSize ? Number((((space.totalSize ?? 0) * 100) / space.maxSize).toFixed(1)) : 0"
          />
        </a-tooltip>
      </a-space>
    </a-flex>

    <div style="margin-bottom: 16px" />

    <PictureSearchForm :onSearch="onSearch" />

    <a-checkbox
      v-model:checked="onlyPublicVisible"
      style="margin-bottom: 16px"
      @change="onTogglePublicVisible"
    >
      仅查看已勾选同步到公共图库的图片
    </a-checkbox>

    <PictureList
      :dataList="dataList"
      :loading="loading"
      :showOp="true"
      :canEdit="canEditPicture"
      :canDelete="canDeletePicture"
      :onReload="fetchData"
    />

    <a-pagination
      style="text-align: right"
      v-model:current="searchParams.current"
      v-model:pageSize="searchParams.pageSize"
      :total="total"
      @change="onPageChange"
    />

    <BatchEditPictureModal
      ref="batchEditPictureModalRef"
      :spaceId="id"
      :pictureList="dataList"
      :onSuccess="onBatchEditPictureSuccess"
    />
    <ImageTextGenerate ref="imageTextGenerateRef" :spaceId="id" :onSuccess="onTextGenerateSuccess" />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { BarChartOutlined, BulbOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons-vue'
import { getSpaceVoByIdUsingGet, upgradeSpaceUsingPost } from '@/api/spaceController'
import { listPictureVoByPageUsingPost } from '@/api/pictureController'
import PictureList from '@/components/PictureList.vue'
import PictureSearchForm from '@/components/PictureSearchForm.vue'
import BatchEditPictureModal from '@/components/BatchEditPictureModal.vue'
import ImageTextGenerate from '@/components/ImageTextGenerate.vue'
import { formatSize } from '@/utils'
import { SPACE_LEVEL_ENUM, SPACE_LEVEL_MAP, SPACE_PERMISSION_ENUM, SPACE_TYPE_MAP } from '@/constants/space'
import { toIdString } from '@/utils/id'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

interface Props {
  id: string | number
}

const props = defineProps<Props>()
const router = useRouter()
const loginUserStore = useLoginUserStore()
const id = computed(() => toIdString(props.id) ?? '')
const space = ref<API.SpaceVO>({})
const dataList = ref<API.PictureVO[]>([])
const total = ref(0)
const loading = ref(true)
const upgradeLoading = ref(false)
const onlyPublicVisible = ref(false)

const searchParams = ref<API.PictureQueryRequest>({
  current: 1,
  pageSize: 12,
  publicVisibleOnly: false,
  sortField: 'createTime',
  sortOrder: 'descend',
})

function createPermissionChecker(permission: string) {
  return computed(() => (space.value.permissionList ?? []).includes(permission))
}

const canManageSpaceUser = createPermissionChecker(SPACE_PERMISSION_ENUM.SPACE_USER_MANAGE)
const canUploadPicture = createPermissionChecker(SPACE_PERMISSION_ENUM.PICTURE_UPLOAD)
const canEditPicture = createPermissionChecker(SPACE_PERMISSION_ENUM.PICTURE_EDIT)
const canDeletePicture = createPermissionChecker(SPACE_PERMISSION_ENUM.PICTURE_DELETE)
const showSpaceUserManage = computed(() => canManageSpaceUser.value && space.value.spaceType === 1)
const canUpgradeSpace = computed(() => {
  const loginUserId = loginUserStore.loginUser?.id
  if (!loginUserId || !space.value.userId) {
    return false
  }
  return loginUserStore.loginUser.userRole === 'admin' || loginUserId === space.value.userId
})
const canUpgradeToNextLevel = computed(() => {
  return Number(space.value.spaceLevel ?? SPACE_LEVEL_ENUM.COMMON) < SPACE_LEVEL_ENUM.FLAGSHIP
})
const nextSpaceLevelText = computed(() => {
  const nextLevel = Number(space.value.spaceLevel ?? SPACE_LEVEL_ENUM.COMMON) + 1
  return SPACE_LEVEL_MAP[nextLevel] ?? '未知等级'
})
const currentSpaceLevelText = computed(() => {
  const level = Number(space.value.spaceLevel ?? SPACE_LEVEL_ENUM.COMMON)
  return SPACE_LEVEL_MAP[level] ?? '未知等级'
})
const spaceUsageTooltip = computed(() => {
  return `当前空间等级：${currentSpaceLevelText.value}，空间使用 ${formatSize(space.value.totalSize)} / ${formatSize(space.value.maxSize)}`
})

const fetchSpaceDetail = async () => {
  try {
    if (!id.value) {
      message.error('空间 id 无效')
      return
    }
    const res = await getSpaceVoByIdUsingGet({ id: id.value as any })
    if (res.data.code === 200 && res.data.data) {
      space.value = res.data.data
    } else {
      message.error('加载空间详情失败：' + res.data.message)
    }
  } catch (e: any) {
    console.error('加载空间详情失败', e)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    if (!id.value) {
      message.error('空间 id 无效')
      return
    }
    const res = await listPictureVoByPageUsingPost({
      spaceId: id.value as any,
      ...searchParams.value,
    })
    if (res.data.code === 200 && res.data.data) {
      dataList.value = res.data.data.records ?? []
      total.value = res.data.data.total ?? 0
    } else {
      message.error('加载图片失败：' + res.data.message)
    }
  } finally {
    loading.value = false
  }
}

const onPageChange = (page: number, pageSize: number) => {
  searchParams.value.current = page
  searchParams.value.pageSize = pageSize
  fetchData()
}

const onSearch = (newSearchParams: API.PictureQueryRequest) => {
  searchParams.value = {
    ...searchParams.value,
    ...newSearchParams,
    current: 1,
    publicVisibleOnly: onlyPublicVisible.value,
  }
  fetchData()
}

const onTogglePublicVisible = () => {
  searchParams.value = {
    ...searchParams.value,
    current: 1,
    publicVisibleOnly: onlyPublicVisible.value,
  }
  fetchData()
}

const batchEditPictureModalRef = ref()
const imageTextGenerateRef = ref()

const doBatchEdit = () => {
  batchEditPictureModalRef.value?.openModal()
}

const doTextGenerate = () => {
  imageTextGenerateRef.value?.openModal()
}

const getTooltipContainer = (triggerNode: HTMLElement) => {
  return triggerNode?.parentElement ?? document.body
}

const doUpgradeSpace = async () => {
  if (!canUpgradeToNextLevel.value || !id.value) {
    return
  }
  upgradeLoading.value = true
  try {
    const res = await upgradeSpaceUsingPost({ id: id.value as any })
    if (res.data.code !== 200) {
      return
    }
    await fetchSpaceDetail()
    message.success(`空间升级成功，当前等级：${currentSpaceLevelText.value}`)
  } finally {
    upgradeLoading.value = false
  }
}

const onBatchEditPictureSuccess = () => {
  fetchData()
}

const onTextGenerateSuccess = () => {
  fetchData()
}

const ensurePageLogin = async () => {
  await loginUserStore.fetchLoginUser()
  if (loginUserStore.loginUser?.id) {
    return true
  }
  message.warning('\u8bf7\u5148\u767b\u5f55')
  await router.replace(`/user/login?redirect=${encodeURIComponent(router.currentRoute.value.fullPath)}`)
  return false
}

onMounted(async () => {
  if (!(await ensurePageLogin())) {
    return
  }
  fetchSpaceDetail()
  fetchData()
})

watch(
  () => props.id,
  async () => {
    if (!(await ensurePageLogin())) {
      return
    }
    fetchSpaceDetail()
    fetchData()
  },
)
</script>

<style scoped>
#spaceDetailPage {
  margin-bottom: 16px;
}
</style>
