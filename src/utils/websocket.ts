// WebSocketService.ts
// 示例页面 URL 格式：
// https://yourapp.com/interview?token=abc123&userProfileId=1905822448827469825&openWords=hello%20world

type MessageCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private callbacks: Map<string, Set<MessageCallback>> = new Map();
  private heartbeatIntervalId: number | null = null;
  private reconnectTimeoutId: number | null = null;
  private readonly heartbeatInterval = 30_000; // 30 s 心跳间隔
  private readonly reconnectInterval = 5_000; // 5 s 重连间隔
  private readonly maxReconnectAttempts = 5; // 最大重连次数
  private reconnectAttempts = 0;
  private readonly employeeId = '10002';
  private isConnecting = false;

  // 从 URL 拿到的用户 ID 和 openWords
  private userId: string = '';
  private openWords: string = '';
  private manualUrl: string = ''; // 存储手动设置的WebSocket URL

  /**
   * 设置完整的WebSocket URL
   * @param url 完整的WebSocket URL
   */
  public setWebSocketUrl(url: string): void {
    this.manualUrl = url;
  }

  /**
   * 构建携带 token 的 WS 地址，并解析 userProfileId & openWords
   */
  private buildUrl(): string {
    // 如果已手动设置了URL，则优先使用
    if (this.manualUrl) {
      console.log('Using manually set WebSocket URL:', this.manualUrl);
      return this.manualUrl;
    }

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
    let base = '';
    // 从环境变量获取当前环境
    const environment = import.meta.env.VITE_APP_ENV || 'dev';
    
    if (environment === 'dev') {
      // 开发环境也使用WSS
      base = 'wss://szrs.shikongai.com:7001/api/ws';
    } else if (environment === 'test') {
      // 测试环境使用WSS
      base = 'wss://szrs.shikongai.com:7001/api/ws';
    } else if (environment === 'prod') {
      // 生产环境使用WSS
      base = 'wss://szrs.shikongai.com:7001/api/ws';
    } else {
      // 默认情况下，始终使用WSS
      base = 'wss://szrs.shikongai.com:7001/api/ws';
    }

    const url = token ? `${base}?token=${token}` : base;
    console.log('Built WebSocket URL:', url);
    return url;
  }

  public connect(): void {
    // 如果正在连接中，则不重复连接
    if (this.isConnecting) {
      return;
    }

    // 如果已经有连接，则不重复连接
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.isConnecting = true;
    const url = this.buildUrl();

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0; // 重置重连计数
        this.emitEvent('connect', { status: 'connected' }); // 触发连接成功事件
        this.sendStartInterview();
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          console.log('Received WebSocket message:', event.data);
          // 如果是心跳响应"pong"，则不尝试解析为JSON
          if (event.data === 'pong') {
            console.log('Received heartbeat response');
            return;
          }
          const data = JSON.parse(event.data);
          this.emitEvent('message', data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected', event);
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emitEvent('disconnect', event);
        this.tryReconnect();
      };

      this.socket.onerror = (event) => {
        console.error('WebSocket error', event);
        this.isConnecting = false;
        this.emitEvent('error', event);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.tryReconnect();
    }
  }

  private tryReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`WebSocket attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      // 清除之前的重连计时器
      if (this.reconnectTimeoutId !== null) {
        clearTimeout(this.reconnectTimeoutId);
      }
      
      this.reconnectTimeoutId = window.setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error(`WebSocket failed to reconnect after ${this.maxReconnectAttempts} attempts`);
    }
  }

  public disconnect(): void {
    // 清除重连计时器
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    this.reconnectAttempts = 0;
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.stopHeartbeat();
    }
  }

  /**
   * 发送"开始访谈"消息
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
      const messageStr = JSON.stringify(msg);
      console.log('Sending WebSocket message:', messageStr);
      this.socket.send(messageStr);
    } else {
      console.warn('WebSocket is not open. Unable to send message:', msg);
      // 如果连接已关闭，尝试重新连接
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }
  }

  // 心跳管理
  private startHeartbeat(): void {
    this.stopHeartbeat(); // 先清除之前的心跳
    
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
