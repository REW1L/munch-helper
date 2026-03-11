import { RoomWebSocketClient, type CharacterNotificationEvent, type WebSocketOptions } from '@/api/webSocket';
import { useEffect, useRef, useState } from 'react';

interface UseRoomWebSocketResult {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  subscribe: (listener: (event: CharacterNotificationEvent) => void) => () => void;
}

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
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track which room/user we're connected to to avoid reconnecting unnecessarily
  const connectionKeyRef = useRef<string>('');

  useEffect(() => {
    // Clean up and disconnect if conditions aren't met
    if (!enabled || !roomId || !userId) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
      setError(null);
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

    const client = new RoomWebSocketClient(roomId, userId, options);
    clientRef.current = client;

    let isMounted = true;

    const connectAsync = async () => {
      try {
        setIsConnecting(true);
        setError(null);
        await client.connect();
        if (isMounted) {
          setIsConnected(true);
          setIsConnecting(false);
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error('Failed to connect to WebSocket');
          setError(error);
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
    };
  }, [enabled, roomId, userId, options]);

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
    error,
    subscribe,
  };
}
