import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock setup — hoisted so it runs before any imports
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockClient = Record<string, any> & {
  _triggerOpen: () => void;
  _triggerClose: () => void;
};

const {
  acquireRoomWebSocketClientMock,
  releaseRoomWebSocketClientMock,
  allCreatedClients,
  registryMock,
  connectBehavior,
} = vi.hoisted(() => {
  const registryMock = new Map<string, { client: MockClient; refCount: number }>();
  const allCreatedClients: MockClient[] = [];
  const connectBehavior = { error: null as Error | null, hang: false };

  function createMockClient(): MockClient {
    const openListeners = new Set<() => void>();
    const closeListeners = new Set<() => void>();

    const client: MockClient = {
      connect: vi.fn(async () => {
        if (connectBehavior.hang) {
          // Hangs indefinitely — simulates in-progress connection
          await new Promise<void>(() => undefined);
          return;
        }
        if (connectBehavior.error) {
          const err = connectBehavior.error;
          connectBehavior.error = null;
          throw err;
        }
        client.isConnected.mockReturnValue(true);
        // Defer open notification to the microtask queue so that all effects
        // (including from a second concurrent hook) have registered their
        // listeners before the open fires.
        await Promise.resolve();
        openListeners.forEach((l) => l());
      }),
      reconnect: vi.fn(async () => {
        if (connectBehavior.error) {
          const err = connectBehavior.error;
          connectBehavior.error = null;
          throw err;
        }
        client.isConnected.mockReturnValue(true);
        await Promise.resolve();
        openListeners.forEach((l) => l());
      }),
      disconnect: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => undefined),
      isConnected: vi.fn().mockReturnValue(false),
      addOpenListener: vi.fn((listener: () => void) => {
        openListeners.add(listener);
        return () => openListeners.delete(listener);
      }),
      addCloseListener: vi.fn((listener: () => void) => {
        closeListeners.add(listener);
        return () => closeListeners.delete(listener);
      }),
      _triggerOpen() {
        openListeners.forEach((l) => l());
      },
      _triggerClose() {
        closeListeners.forEach((l) => l());
      },
    };

    allCreatedClients.push(client);
    return client;
  }

  const acquireRoomWebSocketClientMock = vi.fn((roomId: string, userId: string) => {
    const key = `${roomId}:${userId}`;
    const existing = registryMock.get(key);
    if (existing) {
      existing.refCount += 1;
      return { client: existing.client, isFirstAcquirer: false };
    }
    const client = createMockClient();
    registryMock.set(key, { client, refCount: 1 });
    return { client, isFirstAcquirer: true };
  });

  const releaseRoomWebSocketClientMock = vi.fn((roomId: string, userId: string) => {
    const key = `${roomId}:${userId}`;
    const existing = registryMock.get(key);
    if (!existing) {
      return;
    }
    existing.refCount -= 1;
    if (existing.refCount <= 0) {
      existing.client.disconnect();
      registryMock.delete(key);
    }
  });

  return {
    acquireRoomWebSocketClientMock,
    releaseRoomWebSocketClientMock,
    allCreatedClients,
    registryMock,
    connectBehavior,
  };
});

vi.mock('@/api/webSocket', () => ({
  acquireRoomWebSocketClient: acquireRoomWebSocketClientMock,
  releaseRoomWebSocketClient: releaseRoomWebSocketClientMock,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { useRoomWebSocket } from './useRoomWebSocket';

describe('useRoomWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registryMock.clear();
    allCreatedClients.length = 0;
    connectBehavior.error = null;
    connectBehavior.hang = false;
  });

  it('initialises with no connection when disabled', () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', false));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.isTimedOut).toBe(false);
  });

  it('returns a subscribe function', () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', false));
    expect(typeof result.current.subscribe).toBe('function');
  });

  it('connects successfully when enabled with roomId and userId', async () => {
    const options = { reconnectDelay: 5000 };
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true, options));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });

    expect(allCreatedClients).toHaveLength(1);
    expect(allCreatedClients[0]?.connect).toHaveBeenCalledTimes(1);
    expect(acquireRoomWebSocketClientMock).toHaveBeenCalledWith('room-1', 'user-1', {
      heartbeatInterval: undefined,
      maxReconnectAttempts: undefined,
      reconnectDelay: 5000,
    });
  });

  it('surfaces connection failures via error state', async () => {
    connectBehavior.error = new Error('socket failed');
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => {
      expect(result.current.error?.message).toBe('socket failed');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });
  });

  it('does not connect when roomId is undefined', () => {
    const { result } = renderHook(() => useRoomWebSocket(undefined, 'user-1', true));
    expect(result.current.isConnected).toBe(false);
    expect(acquireRoomWebSocketClientMock).not.toHaveBeenCalled();
  });

  it('does not connect when userId is undefined', () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', undefined, true));
    expect(result.current.isConnected).toBe(false);
    expect(acquireRoomWebSocketClientMock).not.toHaveBeenCalled();
  });

  it('accepts optional WebSocketOptions without crashing', () => {
    const { result } = renderHook(() =>
      useRoomWebSocket('room-1', 'user-1', false, {
        reconnectDelay: 5000,
        maxReconnectAttempts: 10,
      })
    );
    expect(result.current.subscribe).toBeDefined();
  });

  it('delegates subscriptions to the client once connected', async () => {
    const listener = vi.fn();
    const unsubscribe = vi.fn();
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    allCreatedClients[0]?.subscribe.mockReturnValue(unsubscribe);

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    expect(result.current.subscribe(listener)).toBe(unsubscribe);
    expect(allCreatedClients[0]?.subscribe).toHaveBeenCalledWith(listener);
  });

  it('does not reconnect when only callback option identity changes for the same key', async () => {
    const { rerender } = renderHook(
      ({ onOpen }) => useRoomWebSocket('room-1', 'user-1', true, { onOpen }),
      { initialProps: { onOpen: vi.fn() } }
    );

    await waitFor(() => expect(allCreatedClients[0]?.connect).toHaveBeenCalledTimes(1));

    rerender({ onOpen: vi.fn() });

    expect(acquireRoomWebSocketClientMock).toHaveBeenCalledTimes(1);
    expect(allCreatedClients[0]?.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects the old client and creates a new one when room changes', async () => {
    const { rerender, unmount } = renderHook(
      ({ roomId, userId }) => useRoomWebSocket(roomId, userId, true),
      { initialProps: { roomId: 'room-1', userId: 'user-1' } }
    );

    await waitFor(() => expect(allCreatedClients[0]?.connect).toHaveBeenCalledTimes(1));

    rerender({ roomId: 'room-2', userId: 'user-1' });

    await waitFor(() => expect(allCreatedClients).toHaveLength(2));
    expect(allCreatedClients[0]?.disconnect).toHaveBeenCalled();

    unmount();
    expect(allCreatedClients[1]?.disconnect).toHaveBeenCalled();
  });

  it('marks isTimedOut after 8 seconds without a successful reconnect', async () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    vi.useFakeTimers();
    act(() => {
      allCreatedClients[0]?.isConnected.mockReturnValue(false);
      allCreatedClients[0]?._triggerClose();
    });

    expect(result.current.isTimedOut).toBe(false);

    act(() => { vi.advanceTimersByTime(7999); });
    expect(result.current.isTimedOut).toBe(false);

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.isTimedOut).toBe(true);

    vi.useRealTimers();
  });

  it('keeps isReconnecting false before any connect completes', () => {
    connectBehavior.hang = true;
    const { result, unmount } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(false);

    unmount();
  });

  it('marks isReconnecting true after connection drops, clears it on reconnect', async () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    vi.useFakeTimers();
    act(() => {
      allCreatedClients[0]?.isConnected.mockReturnValue(false);
      allCreatedClients[0]?._triggerClose();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(true);

    act(() => {
      allCreatedClients[0]?.isConnected.mockReturnValue(true);
      allCreatedClients[0]?._triggerOpen();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isReconnecting).toBe(false);

    vi.useRealTimers();
  });

  it('clears isReconnecting when the reconnect timeout fires', async () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    vi.useFakeTimers();
    act(() => {
      allCreatedClients[0]?.isConnected.mockReturnValue(false);
      allCreatedClients[0]?._triggerClose();
    });

    expect(result.current.isReconnecting).toBe(true);

    act(() => { vi.advanceTimersByTime(8000); });

    expect(result.current.isTimedOut).toBe(true);
    expect(result.current.isReconnecting).toBe(false);

    vi.useRealTimers();
  });

  it('does not carry reconnecting state into a new room before the new connection opens', async () => {
    const { result, rerender } = renderHook(
      ({ roomId }) => useRoomWebSocket(roomId, 'user-1', true),
      { initialProps: { roomId: 'room-1' } }
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    vi.useFakeTimers();
    act(() => {
      allCreatedClients[0]?.isConnected.mockReturnValue(false);
      allCreatedClients[0]?._triggerClose();
    });

    expect(result.current.isReconnecting).toBe(true);

    connectBehavior.hang = true;
    act(() => { rerender({ roomId: 'room-2' }); });

    expect(result.current.isReconnecting).toBe(false);

    vi.useRealTimers();
  });

  it('does not report reconnecting after the hook is disabled', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useRoomWebSocket('room-1', 'user-1', enabled),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    vi.useFakeTimers();
    act(() => {
      allCreatedClients[0]?.isConnected.mockReturnValue(false);
      allCreatedClients[0]?._triggerClose();
    });

    expect(result.current.isReconnecting).toBe(true);

    act(() => { rerender({ enabled: false }); });

    expect(result.current.isReconnecting).toBe(false);

    vi.useRealTimers();
  });

  it('resets timeout state on manual reconnect and successful open', async () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    vi.useFakeTimers();
    act(() => {
      allCreatedClients[0]?.isConnected.mockReturnValue(false);
      allCreatedClients[0]?._triggerClose();
      vi.advanceTimersByTime(8000);
    });
    expect(result.current.isTimedOut).toBe(true);

    await act(async () => {
      await result.current.reconnect();
    });

    expect(allCreatedClients[0]?.reconnect).toHaveBeenCalledTimes(1);
    expect(result.current.isTimedOut).toBe(false);
    expect(result.current.isConnected).toBe(true);

    vi.useRealTimers();
  });

  describe('shared client registry', () => {
    it('two hooks with the same roomId/userId share one underlying client', async () => {
      const { result: result1 } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));
      const { result: result2 } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

      await waitFor(() => {
        expect(result1.current.isConnected).toBe(true);
        expect(result2.current.isConnected).toBe(true);
      });

      // One client instance, connect called once
      expect(allCreatedClients).toHaveLength(1);
      expect(allCreatedClients[0]?.connect).toHaveBeenCalledTimes(1);
    });

    it('second hook syncs isConnected immediately when client is already connected', async () => {
      const { result: result1 } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));
      await waitFor(() => expect(result1.current.isConnected).toBe(true));

      const { result: result2 } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

      // Synchronously connected — no wait needed
      expect(result2.current.isConnected).toBe(true);
      expect(result2.current.isConnecting).toBe(false);
      // connect was NOT called again
      expect(allCreatedClients[0]?.connect).toHaveBeenCalledTimes(1);
    });

    it('client is disconnected only when the last hook releases', async () => {
      const { unmount: unmount1 } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));
      const { unmount: unmount2 } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

      await waitFor(() => expect(allCreatedClients[0]?.connect).toHaveBeenCalledTimes(1));

      unmount1();
      expect(allCreatedClients[0]?.disconnect).not.toHaveBeenCalled();

      unmount2();
      expect(allCreatedClients[0]?.disconnect).toHaveBeenCalledTimes(1);
    });

    it('both hooks receive the open notification when the connection fires', async () => {
      connectBehavior.hang = true;
      const { result: result1 } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));
      const { result: result2 } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

      expect(result1.current.isConnected).toBe(false);
      expect(result2.current.isConnected).toBe(false);

      act(() => {
        allCreatedClients[0]?.isConnected.mockReturnValue(true);
        allCreatedClients[0]?._triggerOpen();
      });

      expect(result1.current.isConnected).toBe(true);
      expect(result2.current.isConnected).toBe(true);
    });
  });
});
