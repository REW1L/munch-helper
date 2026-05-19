import { API_BASE_URL } from "@/config/runtime";

export type CharacterEventType = 'character_created' | 'character_updated' | 'character_deleted';
export type BattleEventType = 'battle_started' | 'battle_updated' | 'battle_concluded' | 'battle_discarded';

export interface CharacterNotificationEvent {
  event: CharacterEventType;
  event_body: {
    characterId: string;
  };
}

export interface BattleNotificationEvent {
  event: BattleEventType;
  event_body: {
    battleId: string;
  };
}

export type RoomNotificationEvent = CharacterNotificationEvent | BattleNotificationEvent;

export interface WebSocketOptions {
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
}

export class RoomWebSocketClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private userId: string;
  private listeners: Set<(event: RoomNotificationEvent) => void> = new Set();
  private openListeners: Set<() => void> = new Set();
  private closeListeners: Set<() => void> = new Set();
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
    if (options.onOpen) {
      this.openListeners.add(options.onOpen);
    }
    if (options.onClose) {
      this.closeListeners.add(options.onClose);
    }
  }

  addOpenListener(listener: () => void): () => void {
    this.openListeners.add(listener);
    return () => {
      this.openListeners.delete(listener);
    };
  }

  addCloseListener(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
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
          this.notifyOpenListeners();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const parsedEvent = JSON.parse(event.data) as RoomNotificationEvent;
            if (isValidNotificationEvent(parsedEvent)) {
              this.notifyMessageListeners(parsedEvent);
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
            this.notifyCloseListeners();
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

  reconnect(): Promise<void> {
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    return this.connect();
  }

  subscribe(listener: (event: RoomNotificationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private notifyOpenListeners(): void {
    this.openListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[WebSocket] Open listener failed:', error);
      }
    });
  }

  private notifyCloseListeners(): void {
    this.closeListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[WebSocket] Close listener failed:', error);
      }
    });
  }

  private notifyMessageListeners(event: RoomNotificationEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[WebSocket] Message listener failed:', error);
      }
    });
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
}

export function isValidNotificationEvent(event: unknown): event is RoomNotificationEvent {
  if (typeof event !== 'object' || event === null) {
    return false;
  }

  const data = event as Record<string, unknown>;
  const characterEvents: CharacterEventType[] = ['character_created', 'character_updated', 'character_deleted'];
  const battleEvents: BattleEventType[] = ['battle_started', 'battle_updated', 'battle_concluded', 'battle_discarded'];

  if (typeof data.event !== 'string') {
    return false;
  }

  if (characterEvents.includes(data.event as CharacterEventType)) {
    return (
      typeof data.event_body === 'object' &&
      data.event_body !== null &&
      typeof (data.event_body as Record<string, unknown>).characterId === 'string'
    );
  }

  if (battleEvents.includes(data.event as BattleEventType)) {
    return (
      typeof data.event_body === 'object' &&
      data.event_body !== null &&
      typeof (data.event_body as Record<string, unknown>).battleId === 'string'
    );
  }

  return false;
}

// Shared refcounted client registry: one WS connection per (roomId, userId) pair.
interface RegistryEntry {
  client: RoomWebSocketClient;
  refCount: number;
}

const clientRegistry = new Map<string, RegistryEntry>();

export function acquireRoomWebSocketClient(
  roomId: string,
  userId: string,
  options: Pick<WebSocketOptions, 'reconnectDelay' | 'maxReconnectAttempts' | 'heartbeatInterval'> = {}
): { client: RoomWebSocketClient; isFirstAcquirer: boolean } {
  const key = `${roomId}:${userId}`;
  const existing = clientRegistry.get(key);
  if (existing) {
    existing.refCount += 1;
    return { client: existing.client, isFirstAcquirer: false };
  }
  const client = new RoomWebSocketClient(roomId, userId, options);
  clientRegistry.set(key, { client, refCount: 1 });
  return { client, isFirstAcquirer: true };
}

export function releaseRoomWebSocketClient(roomId: string, userId: string): void {
  const key = `${roomId}:${userId}`;
  const existing = clientRegistry.get(key);
  if (!existing) {
    return;
  }
  existing.refCount -= 1;
  if (existing.refCount <= 0) {
    existing.client.disconnect();
    clientRegistry.delete(key);
  }
}
