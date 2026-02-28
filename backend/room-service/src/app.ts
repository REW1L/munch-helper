import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';

export interface RoomLike {
  id: string;
  roomTypeId: 'munchkin';
  createdAt: Date;
}

export interface RoomAssociationLike {
  roomId: string;
  userId: string;
  characterId: string;
  createdAt: Date;
}

export interface RoomModelLike {
  create: (payload: { roomTypeId: string }) => Promise<RoomLike>;
  findById: (id: string) => Promise<RoomLike | null>;
  deleteOne: (query: { _id: string }) => Promise<unknown>;
}

export interface RoomAssociationModelLike {
  create: (payload: { roomId: string; userId: string; characterId: string }) => Promise<RoomAssociationLike>;
  findOne: (query: { roomId: string; userId: string }) => Promise<RoomAssociationLike | null>;
  deleteMany: (query: { roomId: string }) => Promise<unknown>;
}

export interface AppDependencies {
  roomModel: RoomModelLike;
  roomAssociationModel: RoomAssociationModelLike;
  createDefaultCharacter: (payload: {
    roomId: string;
    userId: string;
    userName?: string;
    avatarId?: number;
  }) => Promise<{ id: string }>;
}

export function createApp(deps: AppDependencies) {
  const app = express();

  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'room-service', status: 'ok' });
  });

  app.post('/rooms', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomTypeId = 'munchkin', userId, userName, avatarId } = req.body || {};

      if (roomTypeId !== 'munchkin') {
        return res.status(400).json({ message: 'Only roomTypeId "munchkin" is supported in local mode' });
      }

      if (typeof userId !== 'string' || !userId.trim()) {
        return res.status(400).json({ message: 'Field userId is required and must be a non-empty string' });
      }

      const room = await deps.roomModel.create({ roomTypeId });

      try {
        const character = await deps.createDefaultCharacter({
          roomId: room.id,
          userId: userId.trim(),
          userName,
          avatarId
        });

        await deps.roomAssociationModel.create({
          roomId: room.id,
          userId: userId.trim(),
          characterId: character.id
        });

        res.status(201).json({
          roomId: room.id,
          roomTypeId: room.roomTypeId,
          userId: userId.trim(),
          characterId: character.id,
          createdAt: room.createdAt
        });
      } catch (error: unknown) {
        await deps.roomAssociationModel.deleteMany({ roomId: room.id });
        await deps.roomModel.deleteOne({ _id: room.id });

        return res.status(502).json({
          message: 'Failed to create default character for room owner',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post('/rooms/associations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId, userId, userName, avatarId } = req.body || {};

      if (typeof roomId !== 'string' || !roomId.trim()) {
        return res.status(400).json({ message: 'Field roomId is required and must be a non-empty string' });
      }
      if (typeof userId !== 'string' || !userId.trim()) {
        return res.status(400).json({ message: 'Field userId is required and must be a non-empty string' });
      }

      const room = await deps.roomModel.findById(roomId.trim());
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      const existingAssociation = await deps.roomAssociationModel.findOne({
        roomId: roomId.trim(),
        userId: userId.trim()
      });

      if (existingAssociation) {
        return res.status(200).json({
          roomId: existingAssociation.roomId,
          userId: existingAssociation.userId,
          characterId: existingAssociation.characterId,
          joinedAt: existingAssociation.createdAt,
          alreadyJoined: true
        });
      }

      let association;
      try {
        const character = await deps.createDefaultCharacter({
          roomId: roomId.trim(),
          userId: userId.trim(),
          userName,
          avatarId
        });

        association = await deps.roomAssociationModel.create({
          roomId: roomId.trim(),
          userId: userId.trim(),
          characterId: character.id
        });
      } catch (error: unknown) {
        return res.status(502).json({
          message: 'Failed to create default character while joining room',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      res.status(201).json({
        roomId: association.roomId,
        userId: association.userId,
        characterId: association.characterId,
        joinedAt: association.createdAt,
        alreadyJoined: false
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'CastError') {
        return res.status(404).json({ message: 'Room not found' });
      }

      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
        const association = await deps.roomAssociationModel.findOne({
          roomId: req.body.roomId,
          userId: req.body.userId
        });

        if (association) {
          return res.status(200).json({
            roomId: association.roomId,
            userId: association.userId,
            characterId: association.characterId,
            joinedAt: association.createdAt,
            alreadyJoined: true
          });
        }
      }

      next(error);
    }
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ message: 'Internal server error', details: err.message });
  });

  return app;
}