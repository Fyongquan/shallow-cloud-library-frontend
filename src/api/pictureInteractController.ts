import request from '@/request'

export interface BaseResponse<T> {
  code: number
  data: T
  message: string
}

export interface PictureInteractStatus {
  pictureId?: number | string
  thumbCount?: number
  thumbed?: boolean
  favorCount?: number
  favored?: boolean
  commentCount?: number
}

export interface PictureCommentVO {
  id?: number | string
  userId?: number | string
  pictureId?: number | string
  parentId?: number | string
  rootId?: number | string
  replyUserId?: number | string
  content?: string
  thumbCount?: number
  thumbed?: boolean
  createTime?: string
  updateTime?: string
  user?: API.UserVO
  replyUser?: API.UserVO
  children?: PictureCommentVO[]
}

export interface PageResult<T> {
  records?: T[]
  total?: number
  current?: number
  size?: number
}

export async function getPictureInteractStatusUsingGet(
  params: { pictureId: number | string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<PictureInteractStatus>>('/api/picture/interact/status', {
    method: 'GET',
    params,
    ...(options || {}),
  })
}

export async function doThumbUsingPost(
  body: { pictureId: number | string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<boolean>>('/api/thumb/do', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function undoThumbUsingPost(
  body: { pictureId: number | string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<boolean>>('/api/thumb/undo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function doPictureFavorUsingPost(
  body: { pictureId: number | string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<boolean>>('/api/picture_favor/do', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function undoPictureFavorUsingPost(
  body: { pictureId: number | string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<boolean>>('/api/picture_favor/undo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function addPictureCommentUsingPost(
  body: {
    pictureId: number | string
    content: string
    parentId?: number | string
    replyUserId?: number | string
  },
  options?: Record<string, any>,
) {
  return request<BaseResponse<PictureCommentVO>>('/api/picture_comment/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function editPictureCommentUsingPost(
  body: { id: number | string; content: string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<PictureCommentVO>>('/api/picture_comment/edit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function deletePictureCommentUsingPost(
  body: { id: number | string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<boolean>>('/api/picture_comment/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function listPictureCommentVoByPageUsingPost(
  body: { pictureId: number | string; current?: number; pageSize?: number },
  options?: Record<string, any>,
) {
  return request<BaseResponse<PageResult<PictureCommentVO>>>('/api/picture_comment/list/page/vo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function doPictureCommentThumbUsingPost(
  body: { commentId: number | string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<boolean>>('/api/picture_comment/thumb/do', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function undoPictureCommentThumbUsingPost(
  body: { commentId: number | string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<boolean>>('/api/picture_comment/thumb/undo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}
