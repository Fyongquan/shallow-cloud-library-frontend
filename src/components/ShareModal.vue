<template>
  <div>
    <a-modal v-model:visible="visible" :title="title" :footer="false" @cancel="closeModal">
      <h4>??????</h4>
      <a-typography-link copyable>
        {{ link }}
      </a-typography-link>
      <div style="margin-bottom: 16px" />
      <h4>??????</h4>
      <a-qrcode :value="link" />
    </a-modal>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue'

interface Props {
  title: string;
  link: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "????",
  link: 'https://www.codefather.cn'
})

// ????
const visible = ref(false)

// ????
const openModal = () => {
  visible.value = true
}

// ????
const closeModal = () => {
  visible.value = false;
}

// ????????
defineExpose({
  openModal,
})
</script>
