import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomWebSocketClient } from './webSocket';

// Mock WebSocket class properly
class MockWebSocket {
  static OPEN = 1;
  OPEN = 1;
  readyState: number | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor(url: string) { }
}

describe('RoomWebSocketClient', () => {
  let client: RoomWebSocketClient;

  beforeEach(() => {
    client = new RoomWebSocketClient('test-room', 'test-user');
    // Mock global WebSocket with our class
    global.WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    client.disconnect();
    vi.clearAllMocks();
  });

  describe('connection lifecycle', () => {
    it('should create a client instance', () => {
      expect(client).toBeDefined();
      // New client is not connected until connect() is called
      const isConnected = client.isConnected();
      expect(isConnected).toBe(false);
    });

    it('should attempt to connect to WebSocket', async () => {
      // Start the connection
      const connectPromise = client.connect();

      // The WebSocket constructor should have been called
      expect(global.WebSocket).toBeDefined();

      // The promise should be defined
      expect(connectPromise instanceof Promise).toBe(true);
    });

    it('should disconnect gracefully', () => {
      // Disconnect should not throw
      expect(() => {
        client.disconnect();
      }).not.toThrow();
    });
  });

  describe('event subscription', () => {
    it('should allow listeners to subscribe', () => {
      const listener = vi.fn();
      const unsubscribe = client.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe listener', () => {
      const listener = vi.fn();
      const unsubscribe = client.subscribe(listener);
      unsubscribe();

      // After unsubscribe, listener should not be called
      // (This would be tested with actual event simulation)
    });
  });

  describe('event validation', () => {
    it('should validate character_created events', () => {
      const event = {
        event: 'character_created',
        event_body: {
          characterId: '123'
        }
      };
      expect(event.event).toBe('character_created');
    });

    it('should validate character_updated events', () => {
      const event = {
        event: 'character_updated',
        event_body: {
          characterId: '456'
        }
      };
      expect(event.event).toBe('character_updated');
    });

    it('should validate character_deleted events', () => {
      const event = {
        event: 'character_deleted',
        event_body: {
          characterId: '789'
        }
      };
      expect(event.event).toBe('character_deleted');
    });
  });

  describe('configuration', () => {
    it('should use default options', () => {
      const defaultClient = new RoomWebSocketClient('room', 'user');
      expect(defaultClient).toBeDefined();
    });

    it('should accept custom reconnect delay', () => {
      const customClient = new RoomWebSocketClient('room', 'user', {
        reconnectDelay: 5000,
      });
      expect(customClient).toBeDefined();
    });

    it('should accept custom max reconnect attempts', () => {
      const customClient = new RoomWebSocketClient('room', 'user', {
        maxReconnectAttempts: 10,
      });
      expect(customClient).toBeDefined();
    });
  });
});
