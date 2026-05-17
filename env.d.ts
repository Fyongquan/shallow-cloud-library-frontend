/// <reference types="vite/client" />

import 'axios'

declare module 'vue-cropper/lib/vue-cropper.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

declare module 'axios' {
  interface AxiosRequestConfig<D = any> {
    requestType?: string
  }
}

export {}
