import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import {
  type CharacterEventPublisher,
  NoopCharacterEventPublisher,
  createCharacterEventPayload
} from './publisher';

export interface CharacterLike {
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

interface CreateCharacterAppOptions {
  routePrefix?: string;
  publisher?: CharacterEventPublisher;
}

const normalizeRoutePrefix = (value: string | undefined): string => {
  if (!value) {
    return '/';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
};

export function createApp(characterModel: CharacterModelLike, options: CreateCharacterAppOptions = {}) {
  const app = express();
  const routePrefix = normalizeRoutePrefix(options.routePrefix);
  const publisher = options.publisher || new NoopCharacterEventPublisher();
  const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

  console.info('[character-service] app initialized', {
    routePrefix,
    publisher: publisher.constructor.name
  });

  const deterministicHexColor = (seed: string): string => {
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
  };

  const normalizeHexColor = (value: string): string => value.trim().toUpperCase();

  const getCharacterColor = (character: CharacterLike): string => {
    if (typeof character.color === 'string') {
      const normalizedColor = normalizeHexColor(character.color);
      if (hexColorPattern.test(normalizedColor)) {
        return normalizedColor;
      }
    }

    return deterministicHexColor(character.id);
  };

  const toResponseCharacter = (character: CharacterLike) => ({
    id: character.id,
    roomId: character.roomId,
    userId: character.userId,
    name: character.name,
    avatarId: character.avatarId,
    color: getCharacterColor(character),
    level: character.level,
    power: character.power,
    class: character.class,
    race: character.race,
    gender: character.gender,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt
  });

  const toParamString = (value: string | string[] | undefined): string => {
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return value || '';
  };

  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  if (routePrefix !== '/') {
    // Lambda events may contain stage-prefixed URLs; strip once so route handlers stay unchanged.
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.url === routePrefix) {
        req.url = '/';
      } else if (req.url.startsWith(`${routePrefix}/`)) {
        req.url = req.url.slice(routePrefix.length) || '/';
      }
      next();
    });
  }

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'character-service', status: 'ok' });
  });

  app.get('/characters', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.query;

      console.info('[character-service] list characters request', {
        roomId,
        query: req.query
      });

      if (!roomId || typeof roomId !== 'string') {
        return res.status(400).json({ message: 'Query parameter roomId is required' });
      }

      const characters = await characterModel.find({ roomId }).sort({ createdAt: 1 });

      console.info('[character-service] list characters success', {
        roomId,
        count: characters.length
      });

      res.json({
        items: characters.map(toResponseCharacter)
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
        color,
        level = 1,
        power = 0,
        class: klass = JSON.stringify([]),
        race = JSON.stringify(['Human']),
        gender = JSON.stringify(['male'])
      } = req.body || {};

      console.info('[character-service] create character request', {
        roomId,
        userId,
        name,
        avatarId
      });

      if (typeof roomId !== 'string' || !roomId.trim()) {
        return res.status(400).json({ message: 'Field roomId is required and must be a non-empty string' });
      }
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Field name is required and must be a non-empty string' });
      }
      if (typeof avatarId !== 'number') {
        return res.status(400).json({ message: 'Field avatarId is required and must be a number' });
      }
      if (typeof color !== 'string' || !hexColorPattern.test(normalizeHexColor(color))) {
        return res.status(400).json({ message: 'Field color is required and must be a valid hex color (#RRGGBB)' });
      }

      const character = await characterModel.create({
        roomId: roomId.trim(),
        userId,
        name: name.trim(),
        avatarId,
        color: normalizeHexColor(color),
        level,
        power,
        class: klass,
        race,
        gender
      });

      console.info('[character-service] create character success', {
        roomId: character.roomId,
        characterId: character.id,
        userId: character.userId
      });

      try {
        await publisher.publish(
          createCharacterEventPayload({
            event: 'character_created',
            roomId: character.roomId,
            characterId: character.id
          })
        );
        console.info('[character-service] character_created event queued', {
          roomId: character.roomId,
          characterId: character.id
        });
      } catch (error) {
        console.error('Failed to publish character_created event', error);
      }

      res.status(201).json(toResponseCharacter(character));
    } catch (error) {
      next(error);
    }
  });

  app.patch('/characters/:characterId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const characterId = toParamString(req.params.characterId as string | string[] | undefined);
      const allowed = ['name', 'avatarId', 'color', 'level', 'power', 'class', 'race', 'gender', 'userId'];
      const updates: Record<string, unknown> = {};

      console.info('[character-service] update character request', {
        characterId,
        bodyKeys: Object.keys(req.body || {})
      });

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
      if (Object.prototype.hasOwnProperty.call(updates, 'color')) {
        if (typeof updates.color !== 'string' || !hexColorPattern.test(normalizeHexColor(updates.color))) {
          return res.status(400).json({ message: 'Field color must be a valid hex color (#RRGGBB) when provided' });
        }
        updates.color = normalizeHexColor(updates.color);
      }

      const character = await characterModel.findByIdAndUpdate(characterId, updates, {
        new: true,
        runValidators: true
      });

      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }

      console.info('[character-service] update character success', {
        characterId: character.id,
        roomId: character.roomId,
        updatedKeys: Object.keys(updates)
      });

      try {
        await publisher.publish(
          createCharacterEventPayload({
            event: 'character_updated',
            roomId: character.roomId,
            characterId: character.id
          })
        );
        console.info('[character-service] character_updated event queued', {
          roomId: character.roomId,
          characterId: character.id
        });
      } catch (error) {
        console.error('Failed to publish character_updated event', error);
      }

      res.json(toResponseCharacter(character));
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
      console.info('[character-service] delete character request', { characterId });
      const character = await characterModel.findByIdAndDelete(characterId);

      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }

      console.info('[character-service] delete character success', {
        characterId: character.id,
        roomId: character.roomId
      });

      try {
        await publisher.publish(
          createCharacterEventPayload({
            event: 'character_deleted',
            roomId: character.roomId,
            characterId: character.id
          })
        );
        console.info('[character-service] character_deleted event queued', {
          roomId: character.roomId,
          characterId: character.id
        });
      } catch (error) {
        console.error('Failed to publish character_deleted event', error);
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
    console.error('[character-service] unhandled error', { message: err.message, name: err.name });
    res.status(500).json({ message: 'Internal server error', details: err.message });
  });

  return app;
}