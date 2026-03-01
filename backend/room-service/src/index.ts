import axios from 'axios';
import dotenv from 'dotenv';
import { createApp, type RoomAssociationModelLike, type RoomModelLike } from './app';
import { connectToMongo } from './db';
import { Room, RoomAssociation } from './models/Room';

dotenv.config();

const port = Number(process.env.ROOM_SERVICE_PORT || 8082);
const mongoUri = process.env.ROOM_MONGO_URI || 'mongodb://localhost:27017/tabletop_room_service';
const characterServiceUrl = process.env.CHARACTER_SERVICE_URL || 'http://localhost:8083';
const characterCallTimeoutMs = Number(process.env.CHARACTER_CALL_TIMEOUT_MS || 2000);

interface CreateDefaultCharacterPayload {
  roomId: string;
  userId: string;
  userName?: string;
  avatarId?: number;
}

async function createDefaultCharacter({ roomId, userId, userName, avatarId }: CreateDefaultCharacterPayload): Promise<{ id: string }> {
  const response = await axios.post(
    `${characterServiceUrl}/characters`,
    {
      roomId,
      userId,
      name: typeof userName === 'string' && userName.trim() ? userName.trim() : 'Adventurer',
      avatarId: typeof avatarId === 'number' ? avatarId : 1
    },
    {
      timeout: characterCallTimeoutMs
    }
  );

  return response.data;
}

const roomModel: RoomModelLike = {
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

const roomAssociationModel: RoomAssociationModelLike = {
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

const app = createApp({
  roomModel,
  roomAssociationModel,
  createDefaultCharacter
});

connectToMongo(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`room-service listening on :${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to start room-service', error);
    process.exit(1);
  });