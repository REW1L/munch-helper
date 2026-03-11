import { URL } from 'node:url';
import type { CharacterNotificationEventType, RoomCharacterNotificationEvent } from './types';

const EVENT_TYPES = new Set<CharacterNotificationEventType>(['character_created', 'character_updated', 'character_deleted']);

export interface ConnectRequest {
  connectionId: string;
  roomId: string;
  userId: string;
}

export const parseConnectRequest = (event: unknown): ConnectRequest | null => {
  const data = event as {
    requestContext?: { connectionId?: string };
    queryStringParameters?: Record<string, string | undefined>;
  };

  const connectionId = data.requestContext?.connectionId || '';
  const roomId = (data.queryStringParameters?.roomId || '').trim();
  const userId = (data.queryStringParameters?.userId || '').trim();

  if (!connectionId || !roomId || !userId) {
    return null;
  }

  return { connectionId, roomId, userId };
};

export const parseLocalConnectionRequest = (
  requestUrl: string | undefined
): { roomId: string; userId: string } | null => {
  if (!requestUrl) {
    return null;
  }

  const url = new URL(requestUrl, 'http://localhost');
  if (url.pathname !== '/ws') {
    return null;
  }

  const roomId = (url.searchParams.get('roomId') || '').trim();
  const userId = (url.searchParams.get('userId') || '').trim();

  if (!roomId || !userId) {
    return null;
  }

  return { roomId, userId };
};

export const parseNotificationEvent = (payload: unknown): RoomCharacterNotificationEvent | null => {
  if (typeof payload === 'string') {
    try {
      return parseNotificationEvent(JSON.parse(payload));
    } catch {
      return null;
    }
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as {
    event?: string;
    roomId?: string;
    event_body?: { characterId?: string };
    emittedAt?: string;
    correlationId?: string;
  };

  if (!data.event || !EVENT_TYPES.has(data.event as CharacterNotificationEventType)) {
    return null;
  }

  const roomId = (data.roomId || '').trim();
  const characterId = (data.event_body?.characterId || '').trim();
  if (!roomId || !characterId) {
    return null;
  }

  return {
    event: data.event as CharacterNotificationEventType,
    roomId,
    event_body: {
      characterId
    },
    emittedAt: data.emittedAt || new Date().toISOString(),
    correlationId: data.correlationId
  };
};
