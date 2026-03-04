<template>
  <div>
    <a-modal v-model:visible="visible" :title="title" :footer="false" @cancel="closeModal">
      <h4>复制分享链接</h4>
      <a-typography-link copyable>
        {{ link }}
      </a-typography-link>
      <div v-if="expireTime" style="margin-top: 8px; color: rgba(0, 0, 0, 0.45)">
        有效期至：{{ expireTime }}
      </div>
      <div style="margin-bottom: 16px" />
      <h4>手机扫码查看</h4>
      <a-qrcode :value="link" />
    </a-modal>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue'

interface Props {
  title: string
  link: string
  expireTime?: string
}

withDefaults(defineProps<Props>(), {
  title: '分享图片',
  link: 'https://www.codefather.cn',
  expireTime: undefined,
})

const visible = ref(false)

const openModal = () => {
  visible.value = true
}

const closeModal = () => {
  visible.value = false
}

defineExpose({
  openModal,
})
</script>
