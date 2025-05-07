type MessageCallback = (data: any) => void

class WebSocketService {
  private socket: WebSocket | null = null
  private callbacks: Map<string, Set<MessageCallback>> = new Map()
  private heartbeatIntervalId: number | null = null
  private readonly heartbeatInterval = 30_000 // 30 s
  private readonly employeeId = '10002'        // 分享聊天

  /** 拼接带 token 的 WS 地址 */
  private buildUrl(): string {
    const params = new URLSearchParams(window.location.search)
    let token = params.get('token')

    /* ② 如果 URL 没带，再看 localStorage / sessionStorage / cookie */
    if (!token) {
      token =
        localStorage.getItem('token') ||
        sessionStorage.getItem('token') ||
        (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ?? '')
    } else {
      /* 把从 URL 拿到的 token 缓存下来，后续页面刷新还能用 */
      localStorage.setItem('token', token)
    }

    /* ③ 根据当前协议用 ws:// 或 wss:// */
    const base =
      window.location.protocol === 'https:'
        ? 'wss://172.16.3.130:7000/api/ws'
        : 'ws://172.16.3.130:7000/api/ws'

    return token ? `${base}?token=${token}` : base
  }

  public connect(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    this.socket = new WebSocket(this.buildUrl())

    this.socket.onopen = () => {
      console.log('WebSocket connected')
      this.sendStartInterview()
      this.startHeartbeat()
    }

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.emitEvent('message', data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected', event)
      this.stopHeartbeat()
      this.emitEvent('disconnect', event)
    }

    this.socket.onerror = (event) => {
      console.error('WebSocket error', event)
      this.emitEvent('error', event)
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
      this.stopHeartbeat()
    }
  }

  /* 发送消息相关 -------------------------------------------------------- */

  private sendStartInterview(): void {
    this.sendMessage({
      action: 'C2S_START_INTERVIEW',
      employeeId: this.employeeId,
      audio: '0',
    })
  }

  public sendSayText(text: string): void {
    this.sendMessage({
      action: 'C2S_SAY_TEXT',
      employeeId: this.employeeId,
      data: text,
      audio: '0',
    })
  }

  public sendEndInterview(): void {
    this.sendMessage({
      action: 'C2S_END_INTERVIEW',
      employeeId: this.employeeId,
      audio: '0',
    })
  }

  private sendMessage(msg: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg))
    } else {
      console.warn('WebSocket is not open. Unable to send message:', msg)
    }
  }

  /* 心跳 --------------------------------------------------------------- */

  private startHeartbeat(): void {
    this.heartbeatIntervalId = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('ping')
      }
    }, this.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId !== null) {
      clearInterval(this.heartbeatIntervalId)
      this.heartbeatIntervalId = null
    }
  }

  /* 事件订阅 ----------------------------------------------------------- */

  public on(event: string, callback: MessageCallback): void {
    if (!this.callbacks.has(event)) this.callbacks.set(event, new Set())
    this.callbacks.get(event)!.add(callback)
  }

  public off(event: string, callback: MessageCallback): void {
    this.callbacks.get(event)?.delete(callback)
  }

  private emitEvent(event: string, data: any): void {
    this.callbacks.get(event)?.forEach(cb => cb(data))
  }
}

export default new WebSocketService()
