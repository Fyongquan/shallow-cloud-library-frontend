<template>
  <div id="myFavorPage" class="page-shell">
    <a-card title="我的收藏" :bordered="false">
      <div class="search-bar">
        <a-input-search
          v-model:value="searchParams.searchText"
          placeholder="搜索我收藏的图片"
          enter-button="搜索"
          size="large"
          @search="doSearch"
        />
      </div>
      <PictureList class="picture-list-section" :dataList="dataList" :loading="loading" showPublicThumbCount />
      <a-pagination
        class="page-pagination"
        v-model:current="searchParams.current"
        v-model:pageSize="searchParams.pageSize"
        :total="total"
        @change="onPageChange"
      />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import PictureList from '@/components/PictureList.vue'
import { listPictureVoByPageUsingPost } from '@/api/pictureController.ts'
import { getPictureInteractStatusUsingGet } from '@/api/pictureInteractController.ts'

type PublicPictureVO = API.PictureVO & {
  thumbCount?: number
}

const dataList = ref<PublicPictureVO[]>([])
const total = ref(0)
const loading = ref(true)

const searchParams = reactive<API.PictureQueryRequest>({
  current: 1,
  pageSize: 12,
  sortField: 'createTime',
  sortOrder: 'descend',
  favorOnly: true,
})

const fetchData = async () => {
  loading.value = true
  const res = await listPictureVoByPageUsingPost({
    ...searchParams,
    favorOnly: true,
  })
  if (res.data.code === 200 && res.data.data) {
    const records = (res.data.data.records ?? []) as PublicPictureVO[]
    await fillThumbCount(records)
    dataList.value = records
    total.value = res.data.data.total ?? 0
  }
  loading.value = false
}

const fillThumbCount = async (records: PublicPictureVO[]) => {
  if (!records.length) {
    return
  }
  const tasks = records.map(async (picture) => {
    if (!picture.id) {
      return
    }
    try {
      const res = await getPictureInteractStatusUsingGet({
        pictureId: picture.id,
      } as any)
      if (res.data.code === 200) {
        picture.thumbCount = Number(res.data.data?.thumbCount ?? 0)
      }
    } catch {
      picture.thumbCount = 0
    }
  })
  await Promise.allSettled(tasks)
}

const onPageChange = (page: number, pageSize: number) => {
  searchParams.current = page
  searchParams.pageSize = pageSize
  fetchData()
}

const doSearch = () => {
  searchParams.current = 1
  fetchData()
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
#myFavorPage {
  min-height: 0;
}

#myFavorPage :deep(.ant-card) {
  height: 100%;
}

#myFavorPage :deep(.ant-card-body) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

#myFavorPage .search-bar {
  max-width: 520px;
  margin: 0 auto 16px;
}

#myFavorPage .picture-list-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

#myFavorPage .page-pagination {
  padding-top: 12px;
  text-align: right;
}
</style>

