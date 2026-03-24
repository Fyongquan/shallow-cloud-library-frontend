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
        <a-tooltip :title="`空间使用 ${formatSize(space.totalSize)} / ${formatSize(space.maxSize)}`">
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

    <div style="margin-bottom: 16px" />

    <a-form-item label="按颜色搜索">
      <ColorPicker format="hex" @pureColorChange="onColorChange" />
    </a-form-item>

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
import { ColorPicker } from 'vue3-colorpicker'
import 'vue3-colorpicker/style.css'
import { BarChartOutlined, BulbOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons-vue'
import { getSpaceVoByIdUsingGet } from '@/api/spaceController'
import { listPictureVoByPageUsingPost, searchPictureByColorUsingPost } from '@/api/pictureController'
import PictureList from '@/components/PictureList.vue'
import PictureSearchForm from '@/components/PictureSearchForm.vue'
import BatchEditPictureModal from '@/components/BatchEditPictureModal.vue'
import ImageTextGenerate from '@/components/ImageTextGenerate.vue'
import { formatSize } from '@/utils'
import { SPACE_PERMISSION_ENUM, SPACE_TYPE_MAP } from '@/constants/space'
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

const onColorChange = async (color: string) => {
  loading.value = true
  try {
    const res = await searchPictureByColorUsingPost({
      picColor: color,
      // Keep Snowflake id precision: do not cast to Number in browser.
      spaceId: id.value as any,
    })
    if (res.data.code === 200 && res.data.data) {
      dataList.value = res.data.data ?? []
      total.value = dataList.value.length
    } else {
      message.error('颜色搜索失败：' + res.data.message)
    }
  } finally {
    loading.value = false
  }
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
