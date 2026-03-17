import request from '@/request'

export interface BaseResponse<T> {
  code: number
  data: T
  message: string
}

export interface MessageVO {
  id?: number | string
  userId?: number | string
  content?: string
  messageType?: 'like' | 'favor' | 'comment' | 'system' | string
  messageState?: 0 | 1 | number
  senderId?: number | string
  pictureId?: number | string
  commentId?: number | string
  createTime?: string
  sender?: API.UserVO
}

export interface PageResult<T> {
  records?: T[]
  total?: number
  current?: number
  size?: number
}

export interface MessageQueryRequest {
  current?: number
  pageSize?: number
  messageType?: string
  messageTypeList?: string[]
  messageState?: number
}

export async function listMessageVoByPageUsingPost(
  body: MessageQueryRequest,
  options?: Record<string, any>,
) {
  return request<BaseResponse<PageResult<MessageVO>>>('/api/message/list/page/vo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function readMessageUsingPost(
  body: { id: number | string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<boolean>>('/api/message/read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function readAllMessageUsingPost(
  body: { messageType?: string; messageTypeList?: string[] },
  options?: Record<string, any>,
) {
  return request<BaseResponse<boolean>>('/api/message/read/all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function countUnreadMessageUsingGet(options?: Record<string, any>) {
  return request<BaseResponse<number>>('/api/message/unread/count', {
    method: 'GET',
    ...(options || {}),
  })
}
