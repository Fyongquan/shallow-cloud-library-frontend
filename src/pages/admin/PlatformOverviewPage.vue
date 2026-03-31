<template>
  <div id="platformOverviewPage" class="page-shell">
    <a-space class="toolbar" size="middle">
      <h2 class="title">平台数据总览</h2>
      <a-select
        v-model:value="days"
        style="width: 160px"
        :options="daysOptions"
        @change="fetchData"
      />
      <a-button :loading="loading" @click="fetchData">刷新</a-button>
    </a-space>

    <div class="page-scroll">
      <a-row :gutter="[16, 16]" class="summary-row">
      <a-col :xs="24" :sm="12" :md="8" :xl="6">
        <a-card>
          <a-statistic title="用户总数" :value="overview.totalUserCount ?? 0" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :xl="6">
        <a-card>
          <a-statistic title="图片总数" :value="overview.totalPictureCount ?? 0" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :xl="6">
        <a-card>
          <a-statistic title="空间总数" :value="overview.totalSpaceCount ?? 0" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :xl="6">
        <a-card>
          <a-statistic :title="`近 ${days} 天新增用户`" :value="overview.recentNewUserCount ?? 0" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :xl="6">
        <a-card>
          <a-statistic :title="`近 ${days} 天上传量`" :value="overview.recentUploadCount ?? 0" />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="8" :xl="6">
        <a-card>
          <a-statistic :title="`近 ${days} 天活跃上传用户`" :value="overview.recentActiveUserCount ?? 0" />
        </a-card>
      </a-col>
      </a-row>

      <a-card :title="`近 ${days} 天趋势`" :loading="loading">
        <v-chart :option="chartOption" style="height: 360px; width: 100%" />
      </a-card>

      <a-card title="每日明细" class="detail-card" :loading="loading">
        <a-table
          row-key="day"
          :columns="columns"
          :data-source="overview.dailyStats ?? []"
          :pagination="false"
          size="small"
        />
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'
import { getPlatformOverviewUsingGet } from '@/api/userController'

const daysOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 14 天', value: 14 },
  { label: '近 30 天', value: 30 },
]

const days = ref<number>(7)
const loading = ref<boolean>(false)
const overview = ref<API.PlatformOverviewVO>({})

const columns = [
  {
    title: '日期',
    dataIndex: 'day',
  },
  {
    title: '新增用户',
    dataIndex: 'newUserCount',
  },
  {
    title: '上传图片',
    dataIndex: 'uploadCount',
  },
  {
    title: '活跃上传用户',
    dataIndex: 'activeUserCount',
  },
]

const chartOption = computed(() => {
  const dailyStats = overview.value.dailyStats ?? []
  return {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      top: 0,
      data: ['新增用户', '上传图片', '活跃上传用户'],
    },
    xAxis: {
      type: 'category',
      data: dailyStats.map((item) => item.day),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '新增用户',
        type: 'line',
        smooth: true,
        data: dailyStats.map((item) => item.newUserCount ?? 0),
      },
      {
        name: '上传图片',
        type: 'line',
        smooth: true,
        data: dailyStats.map((item) => item.uploadCount ?? 0),
      },
      {
        name: '活跃上传用户',
        type: 'line',
        smooth: true,
        data: dailyStats.map((item) => item.activeUserCount ?? 0),
      },
    ],
  }
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getPlatformOverviewUsingGet({ days: days.value })
    if (res.data.code === 200 && res.data.data) {
      overview.value = res.data.data
      return
    }
    overview.value = {}
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
#platformOverviewPage {
  width: 100%;
  min-height: 0;
}

.toolbar {
  margin-bottom: 16px;
}

.title {
  margin: 0;
}

.summary-row {
  margin-bottom: 16px;
}

.detail-card {
  margin-top: 16px;
}
</style>
