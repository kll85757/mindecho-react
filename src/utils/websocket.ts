// WebSocketService.ts
// 示例页面 URL 格式：
// https://yourapp.com/interview?token=abc123&userProfileId=1905822448827469825&openWords=hello%20world

type MessageCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private callbacks: Map<string, Set<MessageCallback>> = new Map();
  private heartbeatIntervalId: number | null = null;
  private readonly heartbeatInterval = 30_000; // 30 s 心跳间隔
  private readonly employeeId = '10002';

  // 从 URL 拿到的用户 ID 和 openWords
  private userId: string = '';
  private openWords: string = '';

  /**
   * 构建携带 token 的 WS 地址，并解析 userProfileId & openWords
   */
  private buildUrl(): string {
    const params = new URLSearchParams(window.location.search);

    // 1. 提取 token
    let token = params.get('token') || '';
    if (token) {
      // URL 中带的 token 优先，并缓存
      localStorage.setItem('token', token);
    } else {
      // 否则从本地存储或 cookie 中读取
      token =
        localStorage.getItem('token') ||
        sessionStorage.getItem('token') ||
        (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ?? '');
    }

    // 2. 解析额外参数
    this.userId = params.get('userProfileId') || '';
    this.openWords = params.get('openWords') || '';

    // 3. 根据协议决定 ws 或 wss
    const base =
      window.location.protocol === 'https:'
        ? 'wss://182.92.107.224:7001/api/ws'
        : 'ws://182.92.107.224:7001/api/ws';

    return token ? `${base}?token=${token}` : base;
  }

  public connect(): void {
    // 先解析 URL 参数并初始化 userId/openWords
    const url = this.buildUrl();

    // 如果已经有连接，则不重复连接
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.sendStartInterview();
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emitEvent('message', data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected', event);
      this.stopHeartbeat();
      this.emitEvent('disconnect', event);
    };

    this.socket.onerror = (event) => {
      console.error('WebSocket error', event);
      this.emitEvent('error', event);
    };
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.stopHeartbeat();
    }
  }

  /**
   * 发送“开始访谈”消息
   */
  private sendStartInterview(): void {
    this.sendMessage({
      action: 'C2S_START_INTERVIEW',
      employeeId: this.employeeId,
      audio: '0',
      userProfileId: this.userId,
      openWords: this.openWords,
    });
  }

  /**
   * 发送文本消息
   */
  public sendSayText(text: string): void {
    this.sendMessage({
      action: 'C2S_SAY_TEXT',
      employeeId: this.employeeId,
      data: text,
      audio: '0',
      userProfileId: this.userId,
      openWords: this.openWords,
    });
  }

  /**
   * 发送结束访谈消息
   */
  public sendEndInterview(): void {
    this.sendMessage({
      action: 'C2S_END_INTERVIEW',
      employeeId: this.employeeId,
      audio: '0',
      userProfileId: this.userId,
      openWords: this.openWords,
    });
  }

  /**
   * 统一发送 JSON 消息
   */
  private sendMessage(msg: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn('WebSocket is not open. Unable to send message:', msg);
    }
  }

  // 心跳管理
  private startHeartbeat(): void {
    this.heartbeatIntervalId = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId !== null) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  // 事件订阅
  public on(event: string, callback: MessageCallback): void {
    if (!this.callbacks.has(event)) this.callbacks.set(event, new Set());
    this.callbacks.get(event)!.add(callback);
  }

  public off(event: string, callback: MessageCallback): void {
    this.callbacks.get(event)?.delete(callback);
  }

  private emitEvent(event: string, data: any): void {
    this.callbacks.get(event)?.forEach((cb) => cb(data));
  }
}

export default new WebSocketService();
