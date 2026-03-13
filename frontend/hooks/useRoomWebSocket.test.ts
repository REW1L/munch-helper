import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockClientInstance = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  isConnected: ReturnType<typeof vi.fn>;
  roomId: string;
  userId: string;
  options: unknown;
};

const mockClientInstances: MockClientInstance[] = [];
let nextConnectError: Error | null = null;

vi.mock('@/api/webSocket', () => {
  return {
    RoomWebSocketClient: class MockRoomWebSocketClient {
      connect = vi.fn(async () => {
        if (nextConnectError) {
          const error = nextConnectError;
          nextConnectError = null;
          throw error;
        }

        this.isConnected.mockReturnValue(true);
      });
      disconnect = vi.fn();
      subscribe = vi.fn((listener) => () => undefined);
      isConnected = vi.fn(() => false);

      constructor(roomId: string, userId: string, options?: unknown) {
        mockClientInstances.push({
          connect: this.connect,
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
  });

  it('should initialize hook with disabled connection', () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', 'user-1', false));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
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
    expect(mockClientInstances.at(-1)).toMatchObject({
      roomId: 'room-1',
      userId: 'user-1',
      options,
    });
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
});
