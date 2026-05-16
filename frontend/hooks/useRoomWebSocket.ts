import { RoomWebSocketClient, type CharacterNotificationEvent, type WebSocketOptions } from '@/api/webSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseRoomWebSocketResult {
  isConnected: boolean;
  isConnecting: boolean;
  isTimedOut: boolean;
  error: Error | null;
  reconnect: () => Promise<void>;
  subscribe: (listener: (event: CharacterNotificationEvent) => void) => () => void;
}

const RECONNECT_TIMEOUT_MS = 8000;

/**
 * Hook for managing WebSocket connection to a room and subscribing to character notifications.
 *
 * @param roomId - The room to subscribe to events for
 * @param userId - The user ID for connection authentication
 * @param enabled - Whether to establish the connection (default: true)
 * @param options - Optional configuration for reconnection and heartbeat
 */
export function useRoomWebSocket(
  roomId: string | undefined,
  userId: string | undefined,
  enabled = true,
  options?: WebSocketOptions
): UseRoomWebSocketResult {
  const clientRef = useRef<RoomWebSocketClient | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track which room/user we're connected to to avoid reconnecting unnecessarily
  const connectionKeyRef = useRef<string>('');

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const startReconnectTimeout = useCallback(() => {
    clearReconnectTimeout();
    setIsTimedOut(false);
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current || clientRef.current?.isConnected()) {
        return;
      }

      setIsTimedOut(true);
    }, RECONNECT_TIMEOUT_MS);
  }, [clearReconnectTimeout]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearReconnectTimeout();
    };
  }, [clearReconnectTimeout]);

  useEffect(() => {
    // Clean up and disconnect if conditions aren't met
    if (!enabled || !roomId || !userId) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
      setIsTimedOut(false);
      setError(null);
      clearReconnectTimeout();
      return;
    }

    const connectionKey = `${roomId}:${userId}`;

    // Skip if already connected to the same room/user
    if (connectionKeyRef.current === connectionKey && clientRef.current?.isConnected()) {
      return;
    }

    // Disconnect from previous connection if room/user changed
    if (clientRef.current && connectionKeyRef.current !== connectionKey) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    connectionKeyRef.current = connectionKey;

    let isMounted = true;

    const client = new RoomWebSocketClient(roomId, userId, {
      ...options,
      onOpen: () => {
        if (!isMounted) {
          return;
        }

        clearReconnectTimeout();
        setIsConnected(true);
        setIsConnecting(false);
        setIsTimedOut(false);
        setError(null);
        options?.onOpen?.();
      },
      onClose: () => {
        if (!isMounted) {
          return;
        }

        setIsConnected(false);
        setIsConnecting(false);
        startReconnectTimeout();
        options?.onClose?.();
      },
    });
    clientRef.current = client;

    const connectAsync = async () => {
      try {
        setIsConnecting(true);
        setError(null);
        await client.connect();
        if (isMounted) {
          setIsConnected(true);
          setIsConnecting(false);
          setIsTimedOut(false);
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error('Failed to connect to WebSocket');
          setError(error);
          setIsConnected(false);
          setIsConnecting(false);
        }
      }
    };

    void connectAsync();

    return () => {
      isMounted = false;
      client.disconnect();
      clientRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
      setIsTimedOut(false);
      clearReconnectTimeout();
    };
  }, [clearReconnectTimeout, enabled, roomId, startReconnectTimeout, userId, options]);

  const reconnect = useCallback(async (): Promise<void> => {
    if (!enabled || !roomId || !userId || !clientRef.current || clientRef.current.isConnected()) {
      return;
    }

    clearReconnectTimeout();
    setIsTimedOut(false);
    setError(null);

    try {
      await clientRef.current.reconnect();
      if (!isMountedRef.current) {
        return;
      }

      clearReconnectTimeout();
      setIsConnected(true);
      setIsConnecting(false);
      setIsTimedOut(false);
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      const error = err instanceof Error ? err : new Error('Failed to reconnect to WebSocket');
      setError(error);
      setIsConnected(false);
      setIsConnecting(false);
      startReconnectTimeout();
    }
  }, [clearReconnectTimeout, enabled, roomId, startReconnectTimeout, userId]);

  const subscribe = (listener: (event: CharacterNotificationEvent) => void): (() => void) => {
    if (!clientRef.current) {
      return () => {
        // no-op
      };
    }
    return clientRef.current.subscribe(listener);
  };

  return {
    isConnected,
    isConnecting,
    isTimedOut,
    error,
    reconnect,
    subscribe,
  };
}
