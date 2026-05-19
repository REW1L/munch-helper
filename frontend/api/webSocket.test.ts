import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomWebSocketClient, isValidNotificationEvent } from './webSocket';

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
    global.WebSocket = MockWebSocket as never;
  });

  afterEach(() => {
    client.disconnect();
    vi.clearAllMocks();
  });

  describe('connection lifecycle', () => {
    it('should create a client instance', () => {
      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(false);
    });

    it('should attempt to connect to WebSocket', async () => {
      const connectPromise = client.connect();
      expect(global.WebSocket).toBeDefined();
      expect(connectPromise instanceof Promise).toBe(true);
    });

    it('should disconnect gracefully', () => {
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
    });
  });

  describe('open/close listener fan-out', () => {
    it('fires multiple open listeners on connect', () => {
      const open1 = vi.fn();
      const open2 = vi.fn();
      client.addOpenListener(open1);
      client.addOpenListener(open2);

      const connectPromise = client.connect();
      // trigger onopen via the mock ws
      const ws = (client as never)['ws'] as MockWebSocket;
      ws.onopen?.();

      expect(open1).toHaveBeenCalledTimes(1);
      expect(open2).toHaveBeenCalledTimes(1);

      // clean up pending promise
      ws.onerror?.(new Event('error'));
      return connectPromise.catch(() => undefined);
    });

    it('keeps notifying open listeners when one listener throws', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const open2 = vi.fn();
      client.addOpenListener(() => {
        throw new Error('open listener failed');
      });
      client.addOpenListener(open2);

      const connectPromise = client.connect();
      const ws = (client as never)['ws'] as MockWebSocket;
      ws.onopen?.();

      await expect(connectPromise).resolves.toBeUndefined();
      expect(open2).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith('[WebSocket] Open listener failed:', expect.any(Error));
      consoleError.mockRestore();
    });

    it('allows removing open listeners', () => {
      const open1 = vi.fn();
      const remove = client.addOpenListener(open1);
      remove();

      const connectPromise = client.connect();
      const ws = (client as never)['ws'] as MockWebSocket;
      ws.onopen?.();

      expect(open1).not.toHaveBeenCalled();
      ws.onerror?.(new Event('error'));
      return connectPromise.catch(() => undefined);
    });

    it('fires multiple close listeners on disconnect', () => {
      const close1 = vi.fn();
      const close2 = vi.fn();
      client.addCloseListener(close1);
      client.addCloseListener(close2);

      const connectPromise = client.connect();
      const ws = (client as never)['ws'] as MockWebSocket;
      ws.onopen?.();
      ws.onclose?.();

      expect(close1).toHaveBeenCalledTimes(1);
      expect(close2).toHaveBeenCalledTimes(1);
      return connectPromise.catch(() => undefined);
    });

    it('keeps reconnecting when a close listener throws', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const close2 = vi.fn();
      const attemptReconnect = vi.spyOn(
        client as unknown as { attemptReconnect: () => void },
        'attemptReconnect'
      ).mockImplementation(() => undefined);
      client.addCloseListener(() => {
        throw new Error('close listener failed');
      });
      client.addCloseListener(close2);

      const connectPromise = client.connect();
      const ws = (client as never)['ws'] as MockWebSocket;
      ws.onopen?.();
      ws.onclose?.();

      expect(close2).toHaveBeenCalledTimes(1);
      expect(attemptReconnect).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith('[WebSocket] Close listener failed:', expect.any(Error));
      attemptReconnect.mockRestore();
      consoleError.mockRestore();
      return connectPromise.catch(() => undefined);
    });
  });

  describe('message listener fan-out', () => {
    it('keeps notifying message listeners when one listener throws', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const listener2 = vi.fn();
      client.subscribe(() => {
        throw new Error('message listener failed');
      });
      client.subscribe(listener2);

      const connectPromise = client.connect();
      const ws = (client as never)['ws'] as MockWebSocket;
      ws.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ event: 'character_updated', event_body: { characterId: 'char-1' } }),
        })
      );

      expect(listener2).toHaveBeenCalledWith({ event: 'character_updated', event_body: { characterId: 'char-1' } });
      expect(consoleError).toHaveBeenCalledWith('[WebSocket] Message listener failed:', expect.any(Error));
      consoleError.mockRestore();
      ws.onerror?.(new Event('error'));
      return connectPromise.catch(() => undefined);
    });
  });

  describe('configuration', () => {
    it('should use default options', () => {
      const defaultClient = new RoomWebSocketClient('room', 'user');
      expect(defaultClient).toBeDefined();
    });

    it('should accept custom reconnect delay', () => {
      const customClient = new RoomWebSocketClient('room', 'user', { reconnectDelay: 5000 });
      expect(customClient).toBeDefined();
    });

    it('should accept custom max reconnect attempts', () => {
      const customClient = new RoomWebSocketClient('room', 'user', { maxReconnectAttempts: 10 });
      expect(customClient).toBeDefined();
    });
  });
});

describe('isValidNotificationEvent', () => {
  describe('character events (regression)', () => {
    it.each(['character_created', 'character_updated', 'character_deleted'] as const)(
      'accepts valid %s event',
      (eventType) => {
        expect(
          isValidNotificationEvent({ event: eventType, event_body: { characterId: 'char-1' } })
        ).toBe(true);
      }
    );

    it('rejects character event with missing characterId', () => {
      expect(
        isValidNotificationEvent({ event: 'character_created', event_body: {} })
      ).toBe(false);
    });

    it('rejects character event with non-string characterId', () => {
      expect(
        isValidNotificationEvent({ event: 'character_created', event_body: { characterId: 123 } })
      ).toBe(false);
    });
  });

  describe('battle events', () => {
    it.each(['battle_started', 'battle_updated', 'battle_concluded', 'battle_discarded'] as const)(
      'accepts valid %s event',
      (eventType) => {
        expect(
          isValidNotificationEvent({ event: eventType, event_body: { battleId: 'battle-1' } })
        ).toBe(true);
      }
    );

    it('rejects battle event with missing battleId', () => {
      expect(
        isValidNotificationEvent({ event: 'battle_started', event_body: {} })
      ).toBe(false);
    });

    it('rejects battle event with non-string battleId', () => {
      expect(
        isValidNotificationEvent({ event: 'battle_started', event_body: { battleId: null } })
      ).toBe(false);
    });
  });

  describe('rejections', () => {
    it('rejects null', () => {
      expect(isValidNotificationEvent(null)).toBe(false);
    });

    it('rejects unknown event type', () => {
      expect(
        isValidNotificationEvent({ event: 'unknown_type', event_body: { characterId: 'char-1' } })
      ).toBe(false);
    });

    it('rejects missing event field', () => {
      expect(isValidNotificationEvent({ event_body: { characterId: 'char-1' } })).toBe(false);
    });
  });
});
