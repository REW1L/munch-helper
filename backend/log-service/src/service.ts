import { mongoose } from './db';
import { LogEvent, type LogEventType } from './models/LogEvent';

export interface LogEventInput {
  roomId: string;
  eventType: LogEventType;
  actorId: string;
  summary: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  correlationId?: string | null;
}

export interface LogEventResource {
  id: string;
  roomId: string;
  eventType: LogEventType;
  actorId: string;
  summary: string;
  payload: Record<string, unknown>;
  occurredAt: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface LogEventDocumentLike {
  toJSON(): Record<string, unknown>;
}

export const SUPPORTED_LOG_EVENT_TYPES: LogEventType[] = [
  'character_created',
  'character_updated',
  'character_deleted',
  'battle_started',
  'battle_concluded',
  'battle_discarded'
];

const supportedLogEventTypes = new Set<string>(SUPPORTED_LOG_EVENT_TYPES);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const trimString = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const readNestedString = (value: unknown, key: string): string => {
  if (!isPlainObject(value)) {
    return '';
  }
  return trimString(value[key]);
};

const isLogEventType = (value: string): value is LogEventType => supportedLogEventTypes.has(value);

const toLogEventResource = (document: LogEventDocumentLike): LogEventResource => {
  const json = document.toJSON();

  return {
    ...json,
    id: String(json.id)
  } as LogEventResource;
};

const isCharacterEvent = (eventType: LogEventType): boolean => eventType.startsWith('character_');

const formatValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'none';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
};

const getCharacterName = (payload: Record<string, unknown>, actorId: string): string => {
  const character = payload.character;
  const name = readNestedString(character, 'name');
  return name || actorId;
};

const getBattleName = (payload: Record<string, unknown>): string => {
  const directName = trimString(payload.name);
  if (directName) {
    return directName;
  }
  return readNestedString(payload.battle, 'name');
};

const getBattleResult = (payload: Record<string, unknown>): string => {
  const directResult = trimString(payload.result);
  if (directResult) {
    return directResult;
  }
  return readNestedString(payload.battle, 'result');
};

const battleLabel = (payload: Record<string, unknown>): string => {
  const name = getBattleName(payload);
  return name ? `Battle '${name}'` : 'Battle';
};

export function buildSummary(input: Pick<LogEventInput, 'actorId' | 'eventType' | 'payload'>): string {
  const { actorId, eventType, payload } = input;

  switch (eventType) {
    case 'character_created':
      return `${getCharacterName(payload, actorId)} created`;
    case 'character_deleted':
      return `${getCharacterName(payload, actorId)} removed`;
    case 'character_updated': {
      const changes = isPlainObject(payload.changes) ? payload.changes : {};
      const changedList = Object.entries(changes)
        .flatMap(([field, value]) => {
          if (!isPlainObject(value)) {
            return [];
          }
          return [`${field} ${formatValue(value.prev)} → ${formatValue(value.next)}`];
        })
        .join(', ');
      const name = getCharacterName(payload, actorId);
      return changedList ? `${name} updated: ${changedList}` : `${name} updated`;
    }
    case 'battle_started':
      return `${battleLabel(payload)} started`;
    case 'battle_concluded': {
      const result = getBattleResult(payload);
      return `${battleLabel(payload)} concluded${result ? ` — ${result}` : ''}`;
    }
    case 'battle_discarded':
      return `${battleLabel(payload)} discarded`;
    default:
      return `${eventType} event`;
  }
}

export function parseLogEvent(payload: unknown): LogEventInput | null {
  if (typeof payload === 'string') {
    try {
      return parseLogEvent(JSON.parse(payload));
    } catch {
      return null;
    }
  }

  if (!isPlainObject(payload)) {
    return null;
  }

  const eventTypeValue = trimString(payload.eventType) || trimString(payload.event);
  if (!isLogEventType(eventTypeValue)) {
    return null;
  }

  const roomId = trimString(payload.roomId);
  const eventBody = payload.event_body;
  const actorId = trimString(payload.actorId)
    || (isCharacterEvent(eventTypeValue) ? readNestedString(eventBody, 'characterId') : readNestedString(eventBody, 'battleId'))
    || trimString(payload.battleId);

  if (!roomId || !actorId) {
    return null;
  }

  const occurredAtValue = trimString(payload.occurredAt) || trimString(payload.emittedAt) || new Date().toISOString();
  const parsedOccurredAt = new Date(occurredAtValue);
  const occurredAt = Number.isNaN(parsedOccurredAt.getTime()) ? new Date() : parsedOccurredAt;
  const correlationId = trimString(payload.correlationId) || null;

  const baseInput = {
    roomId,
    eventType: eventTypeValue,
    actorId,
    payload,
    occurredAt,
    correlationId
  };

  return {
    ...baseInput,
    summary: buildSummary(baseInput)
  };
}

export async function persistLogEvent(input: LogEventInput): Promise<void> {
  console.info('log-service.event.persisting', {
    eventType: input.eventType,
    roomId: input.roomId,
    actorId: input.actorId
  });

  await LogEvent.create({
    roomId: input.roomId,
    eventType: input.eventType,
    actorId: input.actorId,
    summary: input.summary,
    payload: input.payload,
    occurredAt: input.occurredAt
  });

  console.info('log-service.event.persisted', {
    eventType: input.eventType,
    roomId: input.roomId,
    actorId: input.actorId
  });
}

export async function listLogEvents(input: {
  roomId: string;
  limit: number;
  before?: string;
}): Promise<LogEventResource[]> {
  const filter: Record<string, unknown> = { roomId: input.roomId };

  if (input.before) {
    filter._id = { $lt: new mongoose.Types.ObjectId(input.before) };
  }

  const documents = await LogEvent.find(filter)
    .sort({ _id: -1 })
    .limit(input.limit)
    .exec();

  return documents.map((document) => toLogEventResource(document));
}

export async function getLogEvent(input: {
  roomId: string;
  logId: string;
}): Promise<LogEventResource | null> {
  const document = await LogEvent.findOne({
    _id: new mongoose.Types.ObjectId(input.logId),
    roomId: input.roomId
  }).exec();

  return document ? toLogEventResource(document) : null;
}
