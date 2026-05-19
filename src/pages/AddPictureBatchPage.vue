<template>
  <div id="addPictureBatchPage" class="page-shell">
    <div class="page-scroll">
      <div class="content">
        <h2>批量上传图片</h2>
        <a-typography-paragraph type="secondary">
          支持从本地一次选择多张图片上传。上传后可以在图片详情页或空间内继续编辑分类、标签等信息。
        </a-typography-paragraph>
        <BatchLocalPictureUpload />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BatchLocalPictureUpload from '@/components/BatchLocalPictureUpload.vue'
</script>

<style scoped>
#addPictureBatchPage .content {
  max-width: 720px;
  margin: 0 auto;
}
</style>
