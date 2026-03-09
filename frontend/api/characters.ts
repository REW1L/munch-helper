import { apiRequest } from '@/api/http';

export interface ApiCharacter {
  id: string;
  roomId: string;
  userId: string | null;
  name: string;
  avatarId: number;
  color: string;
  level: number;
  power: number;
  class: string;
  race: string;
  gender: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GetCharactersResponse {
  items: ApiCharacter[];
}

export interface Character {
  id: string;
  roomId: string;
  userId: string | null;
  nickname: string;
  avatar: number;
  level: number;
  power: number;
  class: string[];
  race: string[];
  gender: string[];
  color: string;
}

export interface CharacterWritePayload {
  roomId: string;
  userId?: string | null;
  nickname: string;
  avatar: number;
  color: string;
  level?: number;
  power?: number;
  class?: string[];
  race?: string[];
  gender?: string[];
}

export interface CharacterUpdatePayload {
  userId?: string | null;
  nickname?: string;
  avatar?: number;
  color?: string;
  level?: number;
  power?: number;
  class?: string[];
  race?: string[];
  gender?: string[];
}

function deterministicHexColor(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const red = (hash >>> 16) & 0xff;
  const green = (hash >>> 8) & 0xff;
  const blue = hash & 0xff;

  const normalizeChannel = (channel: number): number => {
    const min = 70;
    const max = 210;
    return Math.round((channel / 255) * (max - min) + min);
  };

  const toHex = (channel: number): string => normalizeChannel(channel).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalizedValue);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
  } catch {
    // fall through to non-JSON fallback
  }

  if (normalizedValue.includes(',')) {
    return normalizedValue
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [normalizedValue];
}

function serializeArrayField(value: string[] | undefined): string {
  const items = (value || []).map((item) => item.trim()).filter((item) => item.length > 0);
  return JSON.stringify(items);
}

function toFrontendCharacter(apiCharacter: ApiCharacter): Character {
  const hexPattern = /^#[0-9a-fA-F]{6}$/;
  const color = typeof apiCharacter.color === 'string' && hexPattern.test(apiCharacter.color)
    ? apiCharacter.color
    : deterministicHexColor(apiCharacter.id);

  return {
    id: apiCharacter.id,
    roomId: apiCharacter.roomId,
    userId: apiCharacter.userId,
    nickname: apiCharacter.name,
    avatar: apiCharacter.avatarId,
    color,
    level: apiCharacter.level,
    power: apiCharacter.power,
    class: parseArrayField(apiCharacter.class),
    race: parseArrayField(apiCharacter.race),
    gender: parseArrayField(apiCharacter.gender)
  };
}

export async function getCharactersByRoom(roomId: string): Promise<Character[]> {
  const response = await apiRequest<GetCharactersResponse>(`/characters?roomId=${encodeURIComponent(roomId)}`);
  return response.items.map(toFrontendCharacter);
}

export async function createCharacter(payload: CharacterWritePayload): Promise<Character> {
  const created = await apiRequest<ApiCharacter>('/characters', {
    method: 'POST',
    body: {
      roomId: payload.roomId,
      userId: payload.userId ?? null,
      name: payload.nickname,
      avatarId: payload.avatar,
      color: payload.color,
      level: payload.level ?? 1,
      power: payload.power ?? 0,
      class: serializeArrayField(payload.class),
      race: serializeArrayField(payload.race),
      gender: serializeArrayField(payload.gender)
    }
  });

  return toFrontendCharacter(created);
}

export async function updateCharacter(characterId: string, payload: CharacterUpdatePayload): Promise<Character> {
  const body: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'userId')) {
    body.userId = payload.userId;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'nickname')) {
    body.name = payload.nickname;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'avatar')) {
    body.avatarId = payload.avatar;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'color')) {
    body.color = payload.color;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'level')) {
    body.level = payload.level;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'power')) {
    body.power = payload.power;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'class')) {
    body.class = serializeArrayField(payload.class);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'race')) {
    body.race = serializeArrayField(payload.race);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'gender')) {
    body.gender = serializeArrayField(payload.gender);
  }

  const updated = await apiRequest<ApiCharacter>(`/characters/${characterId}`, {
    method: 'PATCH',
    body,
  });

  return toFrontendCharacter(updated);
}
