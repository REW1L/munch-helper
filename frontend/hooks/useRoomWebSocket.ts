import {
  acquireRoomWebSocketClient,
  releaseRoomWebSocketClient,
  type RoomNotificationEvent,
  type RoomWebSocketClient,
  type WebSocketOptions,
} from '@/api/webSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseRoomWebSocketResult {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  isTimedOut: boolean;
  error: Error | null;
  reconnect: () => Promise<void>;
  subscribe: (listener: (event: RoomNotificationEvent) => void) => () => void;
}

const RECONNECT_TIMEOUT_MS = 8000;

/**
 * Hook for managing WebSocket connection to a room and subscribing to room notifications.
 *
 * Multiple hook instances with the same (roomId, userId) share a single underlying
 * RoomWebSocketClient (refcounted registry). Each hook registers its own onOpen/onClose
 * listeners on the shared client, so both hooks get notified on reconnect.
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
  const hasEverConnectedRef = useRef(false);
  const lastConnectedKeyRef = useRef<string>('');
  const connectionKeyRef = useRef<string>('');
  const onOpenRef = useRef(options?.onOpen);
  const onCloseRef = useRef(options?.onClose);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectDelay = options?.reconnectDelay;
  const maxReconnectAttempts = options?.maxReconnectAttempts;
  const heartbeatInterval = options?.heartbeatInterval;

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
    onOpenRef.current = options?.onOpen;
    onCloseRef.current = options?.onClose;
  }, [options?.onClose, options?.onOpen]);

  useEffect(() => {
    if (!enabled || !roomId || !userId) {
      if (clientRef.current && connectionKeyRef.current) {
        const [prevRoom, prevUser] = connectionKeyRef.current.split(':');
        releaseRoomWebSocketClient(prevRoom!, prevUser!);
        clientRef.current = null;
      }
      connectionKeyRef.current = '';
      hasEverConnectedRef.current = false;
      lastConnectedKeyRef.current = '';
      setIsConnected(false);
      setIsConnecting(false);
      setIsTimedOut(false);
      setError(null);
      clearReconnectTimeout();
      return;
    }

    const connectionKey = `${roomId}:${userId}`;

    // Disconnect from previous connection if room/user changed
    if (clientRef.current && connectionKeyRef.current !== connectionKey) {
      const [prevRoom, prevUser] = connectionKeyRef.current.split(':');
      releaseRoomWebSocketClient(prevRoom!, prevUser!);
      clientRef.current = null;
      hasEverConnectedRef.current = false;
      lastConnectedKeyRef.current = '';
    }

    connectionKeyRef.current = connectionKey;

    const { client, isFirstAcquirer } = acquireRoomWebSocketClient(roomId, userId, {
      heartbeatInterval,
      maxReconnectAttempts,
      reconnectDelay,
    });
    clientRef.current = client;

    let isMounted = true;

    const onOpen = () => {
      if (!isMounted) {
        return;
      }

      clearReconnectTimeout();
      hasEverConnectedRef.current = true;
      lastConnectedKeyRef.current = connectionKey;
      setIsConnected(true);
      setIsConnecting(false);
      setIsTimedOut(false);
      setError(null);
      onOpenRef.current?.();
    };

    const onClose = () => {
      if (!isMounted) {
        return;
      }

      setIsConnected(false);
      setIsConnecting(false);
      startReconnectTimeout();
      onCloseRef.current?.();
    };

    // Register listeners before connect so they are in place when the connection opens.
    const removeOpenListener = client.addOpenListener(onOpen);
    const removeCloseListener = client.addCloseListener(onClose);

    if (isFirstAcquirer) {
      setIsConnecting(true);
      client.connect().catch((err) => {
        if (!isMounted) {
          return;
        }
        const connError = err instanceof Error ? err : new Error('Failed to connect to WebSocket');
        setError(connError);
        setIsConnected(false);
        setIsConnecting(false);
      });
    } else if (client.isConnected()) {
      setIsConnected(true);
      setIsConnecting(false);
      hasEverConnectedRef.current = true;
      lastConnectedKeyRef.current = connectionKey;
    } else {
      setIsConnecting(true);
    }

    return () => {
      isMounted = false;
      removeOpenListener();
      removeCloseListener();
      if (connectionKeyRef.current === connectionKey) {
        releaseRoomWebSocketClient(roomId, userId);
        clientRef.current = null;
        hasEverConnectedRef.current = false;
        lastConnectedKeyRef.current = '';
        setIsConnected(false);
        setIsConnecting(false);
        setIsTimedOut(false);
        clearReconnectTimeout();
      }
    };
  }, [
    clearReconnectTimeout,
    enabled,
    heartbeatInterval,
    maxReconnectAttempts,
    reconnectDelay,
    roomId,
    startReconnectTimeout,
    userId,
  ]);

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

      const connError = err instanceof Error ? err : new Error('Failed to reconnect to WebSocket');
      setError(connError);
      setIsConnected(false);
      setIsConnecting(false);
      startReconnectTimeout();
    }
  }, [clearReconnectTimeout, enabled, roomId, startReconnectTimeout, userId]);

  const subscribe = (listener: (event: RoomNotificationEvent) => void): (() => void) => {
    if (!clientRef.current) {
      return () => {
        // no-op
      };
    }
    return clientRef.current.subscribe(listener);
  };

  const currentConnectionKey = enabled && roomId && userId ? `${roomId}:${userId}` : '';
  const isReconnecting =
    hasEverConnectedRef.current &&
    lastConnectedKeyRef.current === currentConnectionKey &&
    !isConnected &&
    !isTimedOut;

  return {
    isConnected,
    isConnecting,
    isReconnecting,
    isTimedOut,
    error,
    reconnect,
    subscribe,
  };
}
