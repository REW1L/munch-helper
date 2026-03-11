import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/webSocket', () => {
  return {
    RoomWebSocketClient: class MockRoomWebSocketClient {
      constructor(roomId: string, userId: string, options?: any) { }
      connect = vi.fn().mockResolvedValue(undefined);
      disconnect = vi.fn();
      subscribe = vi.fn((listener) => () => { });
      isConnected = vi.fn(() => false);
    },
  };
});

import { useRoomWebSocket } from './useRoomWebSocket';

describe('useRoomWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should disable connection when roomId is undefined', () => {
    const { result } = renderHook(() => useRoomWebSocket(undefined, 'user-1', true));

    expect(result.current.isConnected).toBe(false);
  });

  it('should disable connection when userId is undefined', () => {
    const { result } = renderHook(() => useRoomWebSocket('room-1', undefined, true));

    expect(result.current.isConnected).toBe(false);
  });

  it('should accept optional configuration', () => {
    const { result } = renderHook(() =>
      useRoomWebSocket('room-1', 'user-1', false, {
        reconnectDelay: 5000,
        maxReconnectAttempts: 10,
      })
    );

    expect(result.current.subscribe).toBeDefined();
    expect(result.current.isConnected).toBe(false);
  });
});
