<template>
  <div class="picture-search-form">
    <a-form name="searchForm" layout="inline" :model="searchParams" @finish="doSearch">
      <a-form-item label="关键词" name="searchText">
        <a-input
          v-model:value="searchParams.searchText"
          placeholder="从名称和简介搜索"
          allow-clear
        />
      </a-form-item>
      <a-form-item name="category" label="分类">
        <a-auto-complete
          v-model:value="searchParams.category"
          style="min-width: 180px"
          placeholder="请输入分类"
          :options="categoryOptions"
          allow-clear
        />
      </a-form-item>
      <a-form-item name="tags" label="标签">
        <a-select
          v-model:value="searchParams.tags"
          style="min-width: 180px"
          mode="tags"
          placeholder="请输入标签"
          :options="tagOptions"
          allow-clear
        />
      </a-form-item>
      <a-form-item label="日期" name="dateRange">
        <a-range-picker
          style="width: 400px"
          show-time
          v-model:value="dateRange"
          :placeholder="['编辑开始时间', '编辑结束时间']"
          format="YYYY/MM/DD HH:mm:ss"
          :presets="rangePresets"
          @change="onRangeChange"
        />
      </a-form-item>
      <a-form-item label="名称" name="name">
        <a-input v-model:value="searchParams.name" placeholder="请输入名称" allow-clear />
      </a-form-item>
      <a-form-item label="简介" name="introduction">
        <a-input v-model:value="searchParams.introduction" placeholder="请输入简介" allow-clear />
      </a-form-item>
      <a-form-item label="宽度" name="picWidth">
        <a-input-number v-model:value="searchParams.picWidth" />
      </a-form-item>
      <a-form-item label="高度" name="picHeight">
        <a-input-number v-model:value="searchParams.picHeight" />
      </a-form-item>
      <a-form-item name="picFormat">
        <a-space :size="4">
          <span class="filter-label">格式筛选：</span>
          <a-select
            v-model:value="searchParams.picFormat"
            style="min-width: 160px"
            placeholder="请选择格式"
            :options="formatOptions"
            show-search
            allow-clear
          />
        </a-space>
      </a-form-item>
      <a-form-item name="picColor">
        <a-space :size="4">
          <span class="filter-label">颜色筛选：</span>
          <a-popover
            placement="bottomLeft"
            trigger="click"
            :open="showColorPicker"
            @openChange="onColorPickerOpenChange"
            overlayClassName="gallery-color-picker-popover"
          >
            <template #content>
              <div @mousedown="onColorPickerInteract" @touchstart="onColorPickerInteract">
                <ColorPicker
                  isWidget
                  pickerType="chrome"
                  format="hex"
                  :pureColor="normalizeColorInput(searchParams.picColor as any)"
                  @pureColorChange="onColorPickChange"
                />
              </div>
            </template>
            <a-input
              v-model:value="searchParams.picColor"
              style="min-width: 180px"
              placeholder="可输入 / 可点选"
              allow-clear
              @clear="onClearColorFilter"
            />
          </a-popover>
        </a-space>
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" style="width: 96px">搜索</a-button>
          <a-button html-type="reset" @click="doClear">重置</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ColorPicker } from 'vue3-colorpicker'
import 'vue3-colorpicker/style.css'
import { listPictureTagCategoryUsingGet } from '@/api/pictureController.ts'
import { message } from 'ant-design-vue'

interface Props {
  onSearch?: (searchParams: API.PictureQueryRequest) => void
}

const props = defineProps<Props>()

const searchParams = reactive<API.PictureQueryRequest>({})
const categoryOptions = ref<any[]>([])
const tagOptions = ref<any[]>([])
const showColorPicker = ref(false)
const colorPickerInteracted = ref(false)

const formatOptions = [
  { label: 'JPG', value: 'jpg' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' },
  { label: 'WEBP', value: 'webp' },
  { label: 'GIF', value: 'gif' },
  { label: 'BMP', value: 'bmp' },
  { label: 'SVG', value: 'svg' },
]

const normalizeColorInput = (value?: string) => {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }
  const upper = trimmed.toUpperCase()
  return upper.startsWith('#') ? upper : `#${upper}`
}

const doSearch = () => {
  searchParams.picColor = normalizeColorInput(searchParams.picColor as any) as any
  props.onSearch?.(searchParams)
}

const getTagCategoryOptions = async () => {
  const res = await listPictureTagCategoryUsingGet()
  if (res.data.code === 200 && res.data.data) {
    tagOptions.value = (res.data.data.tagList ?? []).map((data: string) => ({
      value: data,
      label: data,
    }))
    categoryOptions.value = (res.data.data.categoryList ?? []).map((data: string) => ({
      value: data,
      label: data,
    }))
  } else {
    message.error('获取标签分类列表失败：' + res.data.message)
  }
}

onMounted(() => {
  getTagCategoryOptions()
})

const dateRange = ref<any[]>([])

const onRangeChange = (dates: any[]) => {
  if (dates?.length >= 2) {
    searchParams.startEditTime = dates[0].toDate()
    searchParams.endEditTime = dates[1].toDate()
  } else {
    searchParams.startEditTime = undefined
    searchParams.endEditTime = undefined
  }
}

const rangePresets = ref([
  { label: '过去 7 天', value: [dayjs().add(-7, 'd'), dayjs()] },
  { label: '过去 14 天', value: [dayjs().add(-14, 'd'), dayjs()] },
  { label: '过去 30 天', value: [dayjs().add(-30, 'd'), dayjs()] },
  { label: '过去 90 天', value: [dayjs().add(-90, 'd'), dayjs()] },
])

const onColorPickChange = (value: string) => {
  if (!colorPickerInteracted.value) {
    return
  }
  searchParams.picColor = normalizeColorInput(value) as any
}

const onColorPickerOpenChange = (open: boolean) => {
  colorPickerInteracted.value = false
  showColorPicker.value = open
}

const onColorPickerInteract = () => {
  colorPickerInteracted.value = true
}

const onClearColorFilter = () => {
  searchParams.picColor = undefined
}

const doClear = () => {
  Object.keys(searchParams).forEach((key) => {
    ;(searchParams as any)[key] = undefined
  })
  dateRange.value = []
  showColorPicker.value = false
  props.onSearch?.(searchParams)
}
</script>

<style scoped>
.picture-search-form .ant-form-item {
  margin-top: 16px;
}

.filter-label {
  color: rgba(0, 0, 0, 0.88);
}

:deep(.gallery-color-picker-popover .ant-popover-inner) {
  padding: 8px;
}
</style>