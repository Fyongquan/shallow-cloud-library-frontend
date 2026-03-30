# 浅度云图库前端（Vue3）

本项目是 **浅度云图库** 的前端应用，基于 Vue3 + Vite + Ant Design Vue，提供公共图库、个人空间、团队空间、消息中心、AI 助手等页面与交互。

## 主要作用

- 用户登录注册与权限页面控制
- 公共图库浏览、筛选、互动（点赞/收藏/评论）
- 个人空间与团队空间管理
- 图片上传、编辑、分享、审核状态展示
- AI 生图、AI 客服、消息通知等业务入口

## 技术栈

- Vue 3
- Vite
- TypeScript
- Ant Design Vue
- Axios
- Pinia
- Vue Router

## 环境准备

- Node.js 18+（建议 Node 20 LTS）
- npm 9+

## 本地开发启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

开发环境参考：

- `.env.development.example`

生产环境参考：

- `.env.production.example`

常用变量：

- `VITE_API_BASE_URL`：后端 API 地址（生产建议 `/api`）
- `VITE_WS_BASE_URL`：WebSocket 地址（可选，不填则自动按当前域名推导）
- `VITE_PROXY_TARGET`：本地开发代理目标地址（例如 `http://localhost:8110`）

### 3. 启动开发服务器

```bash
npm run dev
```

默认访问：

- `http://localhost:5173`

## 打包与预览

```bash
npm run build-only
npm run preview
```

打包产物目录：

- `dist/`

## 生产部署说明

前端通常由 Nginx 托管 `dist` 目录，并将 `/api` 反向代理到后端网关。

如果使用本项目的服务器目录规范，前端部署路径为：

- `/opt/shallow-cloud-library/frontend/dist`

## 常见问题

- 页面出现重复错误提示：应优先使用全局请求拦截与统一异常处理，避免单页面重复弹窗。
- 接口 401 未登录：检查 token 与网关转发配置，确认后端返回业务码已在前端全局拦截处理。
