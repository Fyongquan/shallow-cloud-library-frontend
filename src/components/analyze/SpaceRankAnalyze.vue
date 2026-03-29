<template>
  <div class="space-rank-analyze">
    <a-card :title="cardTitle">
      <a-empty v-if="!loading && dataList.length === 0" description="当前范围暂无空间排行数据" />
      <v-chart v-else :option="options" style="height: 320px; max-width: 100%" :loading="loading" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import VChart from 'vue-echarts'
import 'echarts'
import { computed, ref, watch } from 'vue'
import { getSpaceRankAnalyzeUsingPost } from '@/api/spaceAnalyzeController.ts'
import { toIdString } from '@/utils/id'

interface Props {
  queryAll?: boolean
  queryPublic?: boolean
  spaceId?: string | number
  topN?: number
}

const props = withDefaults(defineProps<Props>(), {
  queryAll: false,
  queryPublic: false,
  topN: 10,
})

const dataList = ref<API.Space[]>([])
const loading = ref(false)

const cardTitle = computed(() => {
  return `空间使用排行分析（Top ${props.topN}）`
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getSpaceRankAnalyzeUsingPost({
      queryAll: props.queryAll,
      queryPublic: props.queryPublic,
      spaceId: toIdString(props.spaceId) as any,
      topN: props.topN,
    })
    if (res.data.code === 200 && res.data.data) {
      dataList.value = res.data.data ?? []
    } else {
      dataList.value = []
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.queryAll, props.queryPublic, props.spaceId, props.topN],
  () => {
    void fetchData()
  },
  { immediate: true }
)

const options = computed(() => {
  const spaceNames = dataList.value.map((item) => item.spaceName)
  const usageData = dataList.value.map((item) => {
    const totalSize = Number(item.totalSize ?? 0)
    return Number((totalSize / (1024 * 1024)).toFixed(2))
  })

  return {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: spaceNames,
      axisLabel: {
        interval: 0,
        rotate: 25,
      },
    },
    yAxis: {
      type: 'value',
      name: '空间使用量(MB)',
    },
    series: [
      {
        name: '空间使用量(MB)',
        type: 'bar',
        data: usageData,
        itemStyle: {
          color: '#5470C6',
        },
      },
    ],
  }
})
</script>

<style scoped></style>
