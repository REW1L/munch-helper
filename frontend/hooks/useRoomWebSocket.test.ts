import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockClientInstance = {
  connect: ReturnType<typeof vi.fn>;
  reconnect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  isConnected: ReturnType<typeof vi.fn>;
  roomId: string;
  userId: string;
  options?: MockWebSocketOptions;
};

const mockClientInstances: MockClientInstance[] = [];
let nextConnectError: Error | null = null;
let nextConnectPromise: Promise<void> | null = null;

type MockWebSocketOptions = {
  onOpen?: () => void;
  onClose?: () => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
};

vi.mock('@/api/webSocket', () => {
  return {
    RoomWebSocketClient: class MockRoomWebSocketClient {
      connect = vi.fn(async () => {
        if (nextConnectPromise) {
          await nextConnectPromise;
          nextConnectPromise = null;
        }

        if (nextConnectError) {
          const error = nextConnectError;
          nextConnectError = null;
          throw error;
        }

        this.isConnected.mockReturnValue(true);
      });
      reconnect = vi.fn(async () => {
        if (nextConnectError) {
          const error = nextConnectError;
          nextConnectError = null;
          throw error;
        }

        this.isConnected.mockReturnValue(true);
        this.options?.onOpen?.();
      });
      disconnect = vi.fn();
      subscribe = vi.fn((listener) => () => undefined);
      isConnected = vi.fn(() => false);
      options?: MockWebSocketOptions;

      constructor(roomId: string, userId: string, options?: MockWebSocketOptions) {
        this.options = options;
        mockClientInstances.push({
          connect: this.connect,
          reconnect: this.reconnect,
          disconnect: this.disconnect,
          subscribe: this.subscribe,
          isConnected: this.isConnected,
          roomId,
          userId,
          options,
        });
      }
    },
  };
});

import { useRoomWebSocket } from './useRoomWebSocket';

describe('useRoomWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientInstances.length = 0;
    nextConnectError = null;
    nextConnectPromise = null;
  });

  it('should initialize hook with disabled connection', () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', false));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.isTimedOut).toBe(false);
  });

  it('should return subscribe function', () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', false));

    expect(typeof result.current.subscribe).toBe('function');
  });

  it('connects successfully when enabled with room and user ids', async () => {
    const options = { reconnectDelay: 5000 };
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true, options));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });

    expect(mockClientInstances.length).toBeGreaterThanOrEqual(1);
    expect(mockClientInstances.at(-1)?.roomId).toBe('room-1');
    expect(mockClientInstances.at(-1)?.userId).toBe('user-1');
    expect(mockClientInstances.at(-1)?.options).toMatchObject(options);
    expect(mockClientInstances.at(-1)?.connect).toHaveBeenCalledTimes(1);
  });

  it('surfaces connection failures', async () => {
    nextConnectError = new Error('socket failed');
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => {
      expect(result.current.error?.message).toBe('socket failed');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });
  });

  it('should disable connection when roomId is undefined', () => {
    const { result } = renderHook(() => useRoomWebSocket(undefined, 'user-1', true));

    expect(result.current.isConnected).toBe(false);
  });

  it('should disable connection when userId is undefined', () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', undefined, true));

    expect(result.current.isConnected).toBe(false);
  });

  it('should accept optional configuration', () => {
    const options = {
      reconnectDelay: 5000,
      maxReconnectAttempts: 10,
    };
    const { result } = renderHook(() =>
      useRoomWebSocket('room-1', 'user-1', false, options)
    );

    expect(result.current.subscribe).toBeDefined();
    expect(result.current.isConnected).toBe(false);
  });

  it('delegates subscriptions to the client once connected', async () => {
    const listener = vi.fn();
    const unsubscribe = vi.fn();
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    mockClientInstances[0]?.subscribe.mockReturnValue(unsubscribe);

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.subscribe(listener)).toBe(unsubscribe);
    expect(mockClientInstances[0]?.subscribe).toHaveBeenCalledWith(listener);
  });

  it('disconnects the old client when room or user changes', async () => {
    const { rerender, unmount } = renderHook(
      ({ roomId, userId }) => useRoomWebSocket(roomId, userId, true),
      {
        initialProps: {
          roomId: 'room-1',
          userId: 'user-1',
        },
      }
    );

    await waitFor(() => {
      expect(mockClientInstances[0]?.connect).toHaveBeenCalledTimes(1);
    });

    rerender({ roomId: 'room-2', userId: 'user-1' });

    await waitFor(() => {
      expect(mockClientInstances).toHaveLength(2);
    });
    expect(mockClientInstances[0]?.disconnect).toHaveBeenCalled();

    unmount();

    expect(mockClientInstances[1]?.disconnect).toHaveBeenCalled();
  });

  it('marks reconnect as timed out after 8 seconds without a successful reconnect', async () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    vi.useFakeTimers();
    act(() => {
      mockClientInstances[0]?.isConnected.mockReturnValue(false);
      mockClientInstances[0]?.options?.onClose?.();
    });

    expect(result.current.isTimedOut).toBe(false);

    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(result.current.isTimedOut).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isTimedOut).toBe(true);

    vi.useRealTimers();
  });

  it('keeps isReconnecting false before any connect completes', () => {
    nextConnectPromise = new Promise(() => undefined);
    const { result, unmount } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(false);

    unmount();
  });

  it('marks isReconnecting true after a successful connection drops and clears it on reconnect', async () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    vi.useFakeTimers();
    act(() => {
      mockClientInstances[0]?.isConnected.mockReturnValue(false);
      mockClientInstances[0]?.options?.onClose?.();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(true);

    act(() => {
      mockClientInstances[0]?.isConnected.mockReturnValue(true);
      mockClientInstances[0]?.options?.onOpen?.();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isReconnecting).toBe(false);

    vi.useRealTimers();
  });

  it('clears isReconnecting when reconnect timeout fires', async () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    vi.useFakeTimers();
    act(() => {
      mockClientInstances[0]?.isConnected.mockReturnValue(false);
      mockClientInstances[0]?.options?.onClose?.();
    });

    expect(result.current.isReconnecting).toBe(true);

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(result.current.isTimedOut).toBe(true);
    expect(result.current.isReconnecting).toBe(false);

    vi.useRealTimers();
  });

  it('resets timeout state on manual reconnect and successful open', async () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', true));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    vi.useFakeTimers();
    act(() => {
      mockClientInstances[0]?.isConnected.mockReturnValue(false);
      mockClientInstances[0]?.options?.onClose?.();
      vi.advanceTimersByTime(8000);
    });
    expect(result.current.isTimedOut).toBe(true);

    await act(async () => {
      await result.current.reconnect();
    });

    expect(mockClientInstances[0]?.reconnect).toHaveBeenCalledTimes(1);
    expect(result.current.isTimedOut).toBe(false);
    expect(result.current.isConnected).toBe(true);

    vi.useRealTimers();
  });
});
