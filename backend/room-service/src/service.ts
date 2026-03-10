import axios from 'axios';
import { createApp, type AppDependencies, type RoomAssociationModelLike, type RoomModelLike } from './app';
import { Room, RoomAssociation } from './models/Room';

export interface RoomServiceOptions {
  characterServiceUrl: string;
  characterCallTimeoutMs: number;
  routePrefix?: string;
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

function createDefaultCharacterFactory(options: RoomServiceOptions): AppDependencies['createDefaultCharacter'] {
  return async ({ roomId, userId, userName, avatarId }) => {
    const colorSeed = typeof userId === 'string' && userId.trim() ? userId : `${roomId}:${userName}`;
    const response = await axios.post(
      `${options.characterServiceUrl}/characters`,
      {
        roomId,
        userId,
        name: typeof userName === 'string' && userName.trim() ? userName.trim() : 'Adventurer',
        avatarId: typeof avatarId === 'number' ? avatarId : 1,
        color: deterministicHexColor(colorSeed)
      },
      {
        timeout: options.characterCallTimeoutMs
      }
    );
    console.log('createDefaultCharacter response', { status: response.status, data: response.data });

    return response.data;
  };
}

export function createRoomModel(): RoomModelLike {
  return {
    create: async (payload) => {
      const maxAttempts = 5;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const room = await Room.create(payload);
          return {
            id: room.id,
            roomTypeId: room.roomTypeId,
            createdAt: room.createdAt
          };
        } catch (error: unknown) {
          const isDuplicateKeyError =
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code?: number }).code === 11000;

          if (!isDuplicateKeyError || attempt === maxAttempts) {
            throw error;
          }
        }
      }

      throw new Error('Failed to create room after retries');
    },
    findById: async (id) => {
      const room = await Room.findById(id);
      if (!room) {
        return null;
      }
      return {
        id: room.id,
        roomTypeId: room.roomTypeId,
        createdAt: room.createdAt
      };
    },
    deleteOne: async (query) => Room.deleteOne(query)
  };
}

export function createRoomAssociationModel(): RoomAssociationModelLike {
  return {
    create: async (payload) => {
      const association = await RoomAssociation.create(payload);
      return {
        roomId: association.roomId,
        userId: association.userId,
        characterId: association.characterId,
        createdAt: association.createdAt
      };
    },
    findOne: async (query) => {
      const association = await RoomAssociation.findOne(query);
      if (!association) {
        return null;
      }
      return {
        roomId: association.roomId,
        userId: association.userId,
        characterId: association.characterId,
        createdAt: association.createdAt
      };
    },
    deleteMany: async (query) => RoomAssociation.deleteMany(query)
  };
}

export function buildRoomApp(options: RoomServiceOptions) {
  return createApp({
    roomModel: createRoomModel(),
    roomAssociationModel: createRoomAssociationModel(),
    createDefaultCharacter: createDefaultCharacterFactory(options)
  }, {
    routePrefix: options.routePrefix
  });
}