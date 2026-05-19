import { URL } from 'node:url';
import type {
  BattleEventBody,
  BattleNotificationEventType,
  CharacterEventBody,
  CharacterNotificationEventType,
  NotificationEventType,
  RoomNotificationEvent,
} from './types';

const CHARACTER_EVENT_TYPES = new Set<CharacterNotificationEventType>([
  'character_created',
  'character_updated',
  'character_deleted',
]);

const BATTLE_EVENT_TYPES = new Set<BattleNotificationEventType>([
  'battle_started',
  'battle_updated',
  'battle_concluded',
  'battle_discarded',
]);

const ALL_EVENT_TYPES = new Set<NotificationEventType>([
  ...CHARACTER_EVENT_TYPES,
  ...BATTLE_EVENT_TYPES,
]);

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

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

export const parseNotificationEvent = (payload: unknown): RoomNotificationEvent | null => {
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
    event_body?: Record<string, unknown>;
    emittedAt?: string;
    correlationId?: string;
  };

  if (!data.event || !ALL_EVENT_TYPES.has(data.event as NotificationEventType)) {
    return null;
  }

  const roomId = (data.roomId || '').trim();
  if (!roomId) {
    return null;
  }

  const eventType = data.event as NotificationEventType;

  if (CHARACTER_EVENT_TYPES.has(eventType as CharacterNotificationEventType)) {
    const characterId = normalizeNonEmptyString(data.event_body?.characterId);
    if (!characterId) {
      return null;
    }
    const eventBody: CharacterEventBody = { characterId };
    return {
      event: eventType,
      roomId,
      event_body: eventBody,
      emittedAt: data.emittedAt || new Date().toISOString(),
      correlationId: data.correlationId,
    };
  }

  // battle_* family
  const battleId = normalizeNonEmptyString(data.event_body?.battleId);
  if (!battleId) {
    return null;
  }
  const eventBody: BattleEventBody = { battleId };
  return {
    event: eventType,
    roomId,
    event_body: eventBody,
    emittedAt: data.emittedAt || new Date().toISOString(),
    correlationId: data.correlationId,
  };
};
