export default class PictureEditWebSocket {
  private pictureId: string | number
  private socket: WebSocket | null
  private eventHandlers: Record<string, Array<(data?: any) => void>>

  constructor(pictureId: string | number) {
    this.pictureId = pictureId
    this.socket = null
    this.eventHandlers = {}
  }

  connect() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const envWsBase = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.trim()
    const wsBaseUrl = envWsBase
      ? envWsBase.replace(/\/$/, '')
      : import.meta.env.DEV
        ? 'ws://localhost:8123'
        : `${wsProtocol}://${window.location.host}`
    const url = `${wsBaseUrl}/api/ws/picture/edit?pictureId=${this.pictureId}`

    this.socket = new WebSocket(url)
    this.socket.binaryType = 'blob'

    this.socket.onopen = () => {
      this.triggerEvent('open')
    }

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      this.triggerEvent(message.type, message)
    }

    this.socket.onclose = (event) => {
      this.triggerEvent('close', event)
    }

    this.socket.onerror = (error) => {
      this.triggerEvent('error', error)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
    }
  }

  sendMessage(message: object) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    }
  }

  on(type: string, handler: (data?: any) => void) {
    if (!this.eventHandlers[type]) {
      this.eventHandlers[type] = []
    }
    this.eventHandlers[type].push(handler)
  }

  triggerEvent(type: string, data?: any) {
    const handlers = this.eventHandlers[type]
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }
}
