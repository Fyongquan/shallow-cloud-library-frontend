<template>
  <div id="basicLayout" :class="{ 'has-sider': hasSider }">
    <a-layout class="layout-root">
      <a-layout-header class="header">
        <GlobalHeader />
      </a-layout-header>
      <div class="layout-body">
        <GlobalSider v-if="hasSider" class="sider" />
        <div class="main-shell">
          <a-layout-content class="content">
            <div class="route-shell">
              <router-view />
            </div>
          </a-layout-content>
          <a-layout-footer class="footer">
            <a href="https://github.com/Fyongquan" target="_blank" rel="noreferrer">开发者 FuYongquan</a>
          </a-layout-footer>
        </div>
      </div>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GlobalHeader from '@/components/GlobalHeader.vue'
import GlobalSider from '@/components/GlobalSider.vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

const loginUserStore = useLoginUserStore()
const hasSider = computed(() => !!loginUserStore.loginUser?.id)
</script>

<style>
#basicLayout {
  --layout-header-height: 64px;
  --layout-footer-height: 56px;
  --layout-sider-width: 200px;
  height: 100%;
  overflow: hidden;
}

#basicLayout .layout-root {
  height: 100%;
}

#basicLayout .header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: var(--layout-header-height);
  line-height: var(--layout-header-height);
  padding-inline: 20px;
  background: white;
  color: unset;
  border-bottom: 1px solid #f0f0f0;
}

#basicLayout .layout-body {
  height: 100%;
  width: 100%;
  padding-top: var(--layout-header-height);
  padding-left: 0;
  box-sizing: border-box;
}

#basicLayout.has-sider .layout-body {
  padding-left: var(--layout-sider-width);
}

#basicLayout .sider {
  position: fixed;
  top: var(--layout-header-height);
  left: 0;
  bottom: 0;
  z-index: 900;
  width: var(--layout-sider-width);
  background: #fff;
  border-right: 0.5px solid #eee;
  padding-top: 20px;
  overflow: hidden;
}

#basicLayout .sider :deep(.ant-layout-sider),
#basicLayout .sider :deep(.ant-layout-sider-children) {
  height: 100%;
}

#basicLayout :deep(.ant-menu-root) {
  border-bottom: none !important;
  border-inline-end: none !important;
}

#basicLayout .main-shell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  box-sizing: border-box;
}

#basicLayout.has-sider .main-shell {
  width: 100%;
}

#basicLayout .content {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 24px 28px 16px;
  box-sizing: border-box;
  background: linear-gradient(to right, #fefefe, #fff);
}

#basicLayout .route-shell {
  width: 100%;
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

#basicLayout .footer {
  flex: 0 0 var(--layout-footer-height);
  width: 100%;
  background: #efefef;
  padding: 16px;
  box-sizing: border-box;
  text-align: center;
  border-top: 1px solid #e8e8e8;
}

.page-shell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-main {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.page-shell > .page-scroll {
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
}

.page-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}
</style>
