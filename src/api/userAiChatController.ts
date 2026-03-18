import request from '@/request'

export interface BaseResponse<T> {
  code: number
  data: T
  message: string
}

export interface PageResult<T> {
  records?: T[]
  total?: number
  current?: number
  size?: number
}

export interface AiChatSessionVO {
  chatId?: string
  chatType?: string
  title?: string
  previewContent?: string
  lastChatTime?: string
}

export interface AiChatMessageVO {
  id?: number | string
  chatId?: string
  chatType?: string
  roleType?: 'USER' | 'ASSISTANT' | 'SYSTEM' | string
  content?: string
  createTime?: string
}

export interface AiChatSessionQueryRequest {
  current?: number
  pageSize?: number
  chatType?: string
}

export interface AiChatMessageQueryRequest {
  current?: number
  pageSize?: number
  chatId: string
}

export interface AiChatRequest {
  chatId: string
  chatType?: string
  userMessage: string
}

export async function getNewChatIdUsingPost(
  body: { chatType?: string },
  options?: Record<string, any>,
) {
  return request<BaseResponse<string>>('/api/userAIChat/getNewChatId', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function doAiChatUsingPost(body: AiChatRequest, options?: Record<string, any>) {
  return request<BaseResponse<string>>('/api/userAIChat/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function getAllUserChatHisUsingPost(
  body: AiChatSessionQueryRequest,
  options?: Record<string, any>,
) {
  return request<BaseResponse<PageResult<AiChatSessionVO>>>('/api/userAIChat/getAllUserChatHis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

export async function getChatHisVoPageUsingPost(
  body: AiChatMessageQueryRequest,
  options?: Record<string, any>,
) {
  return request<BaseResponse<PageResult<AiChatMessageVO>>>('/api/userAIChat/getChatHisVoPage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}
