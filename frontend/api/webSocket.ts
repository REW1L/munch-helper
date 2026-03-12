import { API_BASE_URL } from "@/config/runtime";

export type CharacterEventType = 'character_created' | 'character_updated' | 'character_deleted';

export interface CharacterNotificationEvent {
  event: CharacterEventType;
  event_body: {
    characterId: string;
  };
}

export interface WebSocketOptions {
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class RoomWebSocketClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private userId: string;
  private listeners: Set<(event: CharacterNotificationEvent) => void> = new Set();
  private isIntentionallyClosed = false;
  private reconnectAttempts = 0;
  private reconnectDelay: number;
  private maxReconnectAttempts: number;
  private heartbeatInterval: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    roomId: string,
    userId: string,
    options: WebSocketOptions = {}
  ) {
    this.roomId = roomId;
    this.userId = userId;
    this.reconnectDelay = options.reconnectDelay ?? 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Convert http(s) to ws(s)
        const wsUrl = API_BASE_URL
          .replace(/^https:/, 'wss:')
          .replace(/^http:/, 'ws:')
          .replace(/\/api$/, ''); // Remove trailing /api if present

        const connectionUrl = `${wsUrl}/ws?roomId=${encodeURIComponent(this.roomId)}&userId=${encodeURIComponent(this.userId)}`;

        this.ws = new WebSocket(connectionUrl);

        this.ws.onopen = () => {
          console.log(`[WebSocket] Connected to room ${this.roomId}`);
          this.isIntentionallyClosed = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const parsedEvent = JSON.parse(event.data) as CharacterNotificationEvent;
            if (this.isValidNotificationEvent(parsedEvent)) {
              this.listeners.forEach((listener) => listener(parsedEvent));
            }
            console.info('[WebSocket] Received message:', parsedEvent);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          console.log(`[WebSocket] Disconnected from room ${this.roomId}`);
          this.stopHeartbeat();
          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(listener: (event: CharacterNotificationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private attemptReconnect(): void {
    if (this.isIntentionallyClosed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached or intentionally closed');
      return;
    }

    this.reconnectAttempts += 1;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WebSocket] Attempting to reconnect (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[WebSocket] Reconnection failed:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.ws?.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('[WebSocket] Failed to send heartbeat:', error);
        }
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private isValidNotificationEvent(event: unknown): event is CharacterNotificationEvent {
    if (typeof event !== 'object' || event === null) {
      return false;
    }

    const data = event as Record<string, unknown>;
    const validEvents: CharacterEventType[] = ['character_created', 'character_updated', 'character_deleted'];

    return (
      typeof data.event === 'string' &&
      validEvents.includes(data.event as CharacterEventType) &&
      typeof data.event_body === 'object' &&
      data.event_body !== null &&
      typeof (data.event_body as Record<string, unknown>).characterId === 'string'
    );
  }
}
