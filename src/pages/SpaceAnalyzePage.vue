<template>
  <div id="spaceAnalyzePage">
    <a-flex justify="space-between" align="center" wrap="wrap" :gap="12">
      <h2>空间图库分析 - {{ analyzeTitle }}</h2>
      <a-space v-if="isAdmin">
        <a-button @click="loadSpaceOptions" :loading="spaceOptionsLoading">刷新空间列表</a-button>
      </a-space>
    </a-flex>

    <a-card v-if="isAdmin" class="scope-card" size="small">
      <a-form layout="inline">
        <a-form-item label="分析范围">
          <a-radio-group v-model:value="scopeType" button-style="solid">
            <a-radio-button value="space">指定空间</a-radio-button>
            <a-radio-button value="public">公共图库</a-radio-button>
            <a-radio-button value="all">全部空间</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="scopeType === 'space'" label="空间">
          <a-select
            v-model:value="selectedSpaceId"
            style="width: 320px"
            placeholder="请选择要分析的空间"
            :options="spaceOptions"
            :loading="spaceOptionsLoading"
            show-search
            option-filter-prop="label"
            allow-clear
          />
        </a-form-item>
        <a-form-item v-if="scopeType === 'all'" label="排行数量">
          <a-input-number v-model:value="topN" :min="1" :max="50" />
        </a-form-item>
      </a-form>
    </a-card>

    <a-alert
      v-if="!analyzeReady"
      type="info"
      show-icon
      message="请先选择要分析的空间"
      style="margin-bottom: 16px"
    />

    <a-row v-else :gutter="[16, 16]">
      <a-col :xs="24" :md="12">
        <SpaceUsageAnalyze :spaceId="spaceId" :queryAll="queryAll" :queryPublic="queryPublic" />
      </a-col>
      <a-col :xs="24" :md="12">
        <SpaceCategoryAnalyze :spaceId="spaceId" :queryAll="queryAll" :queryPublic="queryPublic" />
      </a-col>
      <a-col :xs="24" :md="12">
        <SpaceTagAnalyze :spaceId="spaceId" :queryAll="queryAll" :queryPublic="queryPublic" />
      </a-col>
      <a-col :xs="24" :md="12">
        <SpaceSizeAnalyze :spaceId="spaceId" :queryAll="queryAll" :queryPublic="queryPublic" />
      </a-col>
      <a-col :xs="24" :md="12">
        <SpaceUserAnalyze :spaceId="spaceId" :queryAll="queryAll" :queryPublic="queryPublic" />
      </a-col>
      <a-col :xs="24" :md="12" v-if="isAdmin && scopeType === 'all'">
        <SpaceRankAnalyze
          :spaceId="spaceId"
          :queryAll="queryAll"
          :queryPublic="queryPublic"
          :topN="topN"
        />
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { listSpaceByPageUsingPost } from '@/api/spaceController.ts'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'
import SpaceUsageAnalyze from '@/components/analyze/SpaceUsageAnalyze.vue'
import SpaceCategoryAnalyze from '@/components/analyze/SpaceCategoryAnalyze.vue'
import SpaceTagAnalyze from '@/components/analyze/SpaceTagAnalyze.vue'
import SpaceSizeAnalyze from '@/components/analyze/SpaceSizeAnalyze.vue'
import SpaceUserAnalyze from '@/components/analyze/SpaceUserAnalyze.vue'
import SpaceRankAnalyze from '@/components/analyze/SpaceRankAnalyze.vue'
import { toIdString } from '@/utils/id'

type ScopeType = 'space' | 'public' | 'all'

const route = useRoute()
const loginUserStore = useLoginUserStore()

const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')

const scopeType = ref<ScopeType>('space')
const selectedSpaceId = ref<string | undefined>()
const topN = ref<number>(10)

const spaceOptions = ref<{ label: string; value: string }[]>([])
const spaceOptionsLoading = ref(false)

const parseBooleanQuery = (value: unknown) => {
  if (Array.isArray(value)) {
    return parseBooleanQuery(value[0])
  }
  return value === '1' || value === 'true' || value === true
}

const parseTopN = (value: unknown) => {
  if (Array.isArray(value)) {
    return parseTopN(value[0])
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10
  }
  return Math.min(Math.max(Math.trunc(parsed), 1), 50)
}

const applyRouteState = () => {
  topN.value = parseTopN(route.query.topN)
  if (isAdmin.value) {
    if (parseBooleanQuery(route.query.queryAll)) {
      scopeType.value = 'all'
      selectedSpaceId.value = undefined
      return
    }
    if (parseBooleanQuery(route.query.queryPublic)) {
      scopeType.value = 'public'
      selectedSpaceId.value = undefined
      return
    }
  }
  scopeType.value = 'space'
  selectedSpaceId.value = toIdString(route.query.spaceId)
}

const loadSpaceOptions = async () => {
  if (!isAdmin.value) {
    return
  }
  spaceOptionsLoading.value = true
  try {
    const res = await listSpaceByPageUsingPost({
      current: 1,
      pageSize: 200,
      sortField: 'updateTime',
      sortOrder: 'descend',
    })
    if (res.data.code !== 200 || !res.data.data) {
      spaceOptions.value = []
      return
    }
    spaceOptions.value = (res.data.data.records ?? []).map((space) => {
      const spaceId = toIdString(space.id) ?? ''
      return {
        value: spaceId,
        label: `${space.spaceName ?? '未命名空间'}（${spaceId}）`,
      }
    })
  } finally {
    spaceOptionsLoading.value = false
  }
}

onMounted(() => {
  applyRouteState()
  void loadSpaceOptions()
})

watch(
  () => route.query,
  () => {
    applyRouteState()
  }
)

const queryAll = computed(() => isAdmin.value && scopeType.value === 'all')
const queryPublic = computed(() => isAdmin.value && scopeType.value === 'public')
const spaceId = computed(() => (scopeType.value === 'space' ? selectedSpaceId.value : undefined))
const analyzeReady = computed(() => queryAll.value || queryPublic.value || !!spaceId.value)

const analyzeTitle = computed(() => {
  if (queryAll.value) {
    return '全部空间'
  }
  if (queryPublic.value) {
    return '公共图库'
  }
  return spaceId.value ? `空间 ${spaceId.value}` : '未选择空间'
})
</script>

<style scoped>
#spaceAnalyzePage {
  margin-bottom: 16px;
}

.scope-card {
  margin-bottom: 16px;
}
</style>
