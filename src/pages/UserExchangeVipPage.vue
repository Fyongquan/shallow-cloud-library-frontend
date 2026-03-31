<template>
  <div id="vipMallPage" class="page-shell">
    <div class="page-scroll">
      <div class="mall-content">
        <a-card title="会员积分商城" :bordered="false">
          <a-row :gutter="16">
            <a-col :xs="24" :md="12">
              <a-statistic title="当前积分" :value="scoreInfo.userScore ?? 0" />
            </a-col>
            <a-col :xs="24" :md="12">
              <a-statistic
                title="会员到期时间"
                :value="scoreInfo.vipExpireTime ? formatDate(scoreInfo.vipExpireTime) : '未开通会员'"
              />
            </a-col>
          </a-row>
        </a-card>

        <a-card title="会员套餐" style="margin-top: 16px" :bordered="false">
          <a-row :gutter="16">
            <a-col v-for="item in vipPackages" :key="item.packageType" :xs="24" :md="8">
              <a-card size="small" class="package-card">
                <h3>{{ item.packageName }}</h3>
                <p>{{ item.description }}</p>
                <div class="package-cost">{{ item.scoreCost }} 积分</div>
                <a-button
                  type="primary"
                  block
                  :loading="exchangeLoading === item.packageType"
                  @click="exchangeVip(item.packageType)"
                >
                  立即兑换
                </a-button>
              </a-card>
            </a-col>
          </a-row>
        </a-card>

        <a-card title="积分流水" style="margin-top: 16px" :bordered="false">
          <a-table
            :columns="columns"
            :data-source="scoreRecordList"
            :pagination="false"
            :loading="recordLoading"
            row-key="id"
          />
          <div class="pager-wrap">
            <a-pagination
              :current="recordQuery.current"
              :page-size="recordQuery.pageSize"
              :total="recordTotal"
              :show-size-changer="false"
              @change="onRecordPageChange"
            />
          </div>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  exchangeVipByScoreUsingPost,
  getMyScoreInfoUsingGet,
  listMyScoreRecordByPageUsingPost,
  listVipPackageUsingGet,
} from '@/api/userController.ts'
import { useLoginUserStore } from '@/stores/useLoginUserStore.ts'

const loginUserStore = useLoginUserStore()

const scoreInfo = ref<API.UserScoreInfoVO>({
  userScore: 0,
})
const vipPackages = ref<API.VipPackageVO[]>([])
const scoreRecordList = ref<API.UserScoreRecordVO[]>([])
const recordTotal = ref(0)
const recordLoading = ref(false)
const exchangeLoading = ref<string>()

const recordQuery = reactive<API.UserScoreRecordQueryRequest>({
  current: 1,
  pageSize: 10,
})

const columns = [
  {
    title: '流水号',
    dataIndex: 'id',
  },
  {
    title: '时间',
    dataIndex: 'createTime',
    customRender: ({ text }: { text?: string }) => text || '-',
  },
  {
    title: '变动',
    dataIndex: 'scoreChange',
  },
  {
    title: '变动后积分',
    dataIndex: 'scoreAfter',
  },
  {
    title: '说明',
    dataIndex: 'description',
  },
]

const formatDate = (value?: string) => {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

const loadScoreInfo = async () => {
  const res = await getMyScoreInfoUsingGet()
  if (res.data.code === 200 && res.data.data) {
    scoreInfo.value = res.data.data
    return
  }
  message.error(res.data.message ?? '获取积分信息失败')
}

const loadVipPackage = async () => {
  const res = await listVipPackageUsingGet()
  if (res.data.code === 200 && res.data.data) {
    vipPackages.value = res.data.data
    return
  }
  message.error(res.data.message ?? '获取会员套餐失败')
}

const loadScoreRecord = async () => {
  recordLoading.value = true
  try {
    const res = await listMyScoreRecordByPageUsingPost(recordQuery)
    if (res.data.code === 200 && res.data.data) {
      scoreRecordList.value = res.data.data.records ?? []
      recordTotal.value = Number(res.data.data.total ?? 0)
      return
    }
    message.error(res.data.message ?? '获取积分流水失败')
  } finally {
    recordLoading.value = false
  }
}

const exchangeVip = async (packageType?: string) => {
  if (!packageType) {
    return
  }
  exchangeLoading.value = packageType
  try {
    const res = await exchangeVipByScoreUsingPost({
      packageType,
    })
    if (res.data.code !== 200 || !res.data.data) {
      message.error(res.data.message ?? '兑换失败')
      return
    }
    message.success('兑换成功')
    await loginUserStore.fetchLoginUser()
    await Promise.all([loadScoreInfo(), loadScoreRecord()])
  } finally {
    exchangeLoading.value = undefined
  }
}

const onRecordPageChange = (current: number) => {
  recordQuery.current = current
  loadScoreRecord()
}

onMounted(async () => {
  await Promise.all([loadScoreInfo(), loadVipPackage(), loadScoreRecord()])
})
</script>

<style scoped>
#vipMallPage {
  min-height: 0;
}

.mall-content {
  max-width: 1000px;
  margin: 0 auto;
}

.package-card {
  height: 100%;
}

.package-cost {
  margin: 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1677ff;
}

.pager-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
