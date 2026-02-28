import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';

export interface CharacterLike {
  id: string;
  roomId: string;
  userId: string | null;
  name: string;
  avatarId: number;
  level: number;
  power: number;
  class: string;
  race: string;
  gender: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterModelLike {
  find: (query: { roomId: string }) => { sort: (sortBy: { createdAt: 1 }) => Promise<CharacterLike[]> };
  create: (payload: Omit<CharacterLike, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CharacterLike>;
  findByIdAndUpdate: (
    id: string,
    updates: Record<string, unknown>,
    options: { new: boolean; runValidators: boolean }
  ) => Promise<CharacterLike | null>;
  findByIdAndDelete: (id: string) => Promise<CharacterLike | null>;
}

export function createApp(characterModel: CharacterModelLike) {
  const app = express();

  const toParamString = (value: string | string[] | undefined): string => {
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return value || '';
  };

  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'character-service', status: 'ok' });
  });

  app.get('/characters', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.query;

      if (!roomId || typeof roomId !== 'string') {
        return res.status(400).json({ message: 'Query parameter roomId is required' });
      }

      const characters = await characterModel.find({ roomId }).sort({ createdAt: 1 });

      res.json({
        items: characters.map((character) => ({
          id: character.id,
          roomId: character.roomId,
          userId: character.userId,
          name: character.name,
          avatarId: character.avatarId,
          level: character.level,
          power: character.power,
          class: character.class,
          race: character.race,
          gender: character.gender,
          createdAt: character.createdAt,
          updatedAt: character.updatedAt
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/characters', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        roomId,
        userId = null,
        name,
        avatarId,
        level = 1,
        power = 0,
        class: klass = '',
        race = '',
        gender = ''
      } = req.body || {};

      if (typeof roomId !== 'string' || !roomId.trim()) {
        return res.status(400).json({ message: 'Field roomId is required and must be a non-empty string' });
      }
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Field name is required and must be a non-empty string' });
      }
      if (typeof avatarId !== 'number') {
        return res.status(400).json({ message: 'Field avatarId is required and must be a number' });
      }

      const character = await characterModel.create({
        roomId: roomId.trim(),
        userId,
        name: name.trim(),
        avatarId,
        level,
        power,
        class: klass,
        race,
        gender
      });

      res.status(201).json({
        id: character.id,
        roomId: character.roomId,
        userId: character.userId,
        name: character.name,
        avatarId: character.avatarId,
        level: character.level,
        power: character.power,
        class: character.class,
        race: character.race,
        gender: character.gender,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt
      });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/characters/:characterId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const characterId = toParamString(req.params.characterId as string | string[] | undefined);
      const allowed = ['name', 'avatarId', 'level', 'power', 'class', 'race', 'gender', 'userId'];
      const updates: Record<string, unknown> = {};

      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          updates[key] = req.body[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update' });
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
        if (typeof updates.name !== 'string' || !updates.name.trim()) {
          return res.status(400).json({ message: 'Field name must be a non-empty string when provided' });
        }
        updates.name = updates.name.trim();
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'avatarId') && typeof updates.avatarId !== 'number') {
        return res.status(400).json({ message: 'Field avatarId must be a number when provided' });
      }

      const character = await characterModel.findByIdAndUpdate(characterId, updates, {
        new: true,
        runValidators: true
      });

      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }

      res.json({
        id: character.id,
        roomId: character.roomId,
        userId: character.userId,
        name: character.name,
        avatarId: character.avatarId,
        level: character.level,
        power: character.power,
        class: character.class,
        race: character.race,
        gender: character.gender,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'CastError') {
        return res.status(404).json({ message: 'Character not found' });
      }
      next(error);
    }
  });

  app.delete('/characters/:characterId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const characterId = toParamString(req.params.characterId as string | string[] | undefined);
      const character = await characterModel.findByIdAndDelete(characterId);

      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }

      res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'CastError') {
        return res.status(404).json({ message: 'Character not found' });
      }
      next(error);
    }
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ message: 'Internal server error', details: err.message });
  });

  return app;
}