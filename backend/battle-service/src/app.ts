import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import {
  type BattleEventPublisher,
  NoopBattleEventPublisher,
  createBattleStartedEventPayload
} from './publisher';

export type BattleStatus = 'active' | 'concluded' | 'discarded';
export type BattleResult = 'players_win' | 'monster_wins' | null;

export interface BonusItem {
  id: string;
  value: number;
}

export interface MonsterItem {
  id: string;
  name: string;
  level: number;
}

export interface BattleLike {
  id: string;
  roomId: string;
  name: string;
  status: BattleStatus;
  playerSide: {
    characterIds: string[];
    bonuses: BonusItem[];
  };
  monsterSide: {
    monsters: MonsterItem[];
    bonuses: BonusItem[];
  };
  result: BattleResult;
  concludedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBattlePayload {
  roomId: string;
  name: string;
  status: 'active';
  playerSide: {
    characterIds: string[];
    bonuses: BonusItem[];
  };
  monsterSide: {
    monsters: MonsterItem[];
    bonuses: BonusItem[];
  };
  result: null;
  concludedAt: null;
}

export interface BattleModelLike {
  findOne: (query: { roomId: string; status: 'active' }) => Promise<BattleLike | null>;
  create: (payload: CreateBattlePayload) => Promise<BattleLike>;
}

interface CreateBattleAppOptions {
  routePrefix?: string;
  publisher?: BattleEventPublisher;
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

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 11000;

export function createApp(battleModel: BattleModelLike, options: CreateBattleAppOptions = {}) {
  const app = express();
  const routePrefix = normalizeRoutePrefix(options.routePrefix);
  const publisher = options.publisher || new NoopBattleEventPublisher();

  console.info('[battle-service] app initialized', {
    routePrefix,
    publisher: publisher.constructor.name
  });

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
    res.json({ service: 'battle-service', status: 'ok' });
  });

  app.get('/battles', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.query;

      if (typeof roomId !== 'string' || !roomId.trim()) {
        return res.status(400).json({ message: 'Query parameter roomId is required' });
      }

      const battle = await battleModel.findOne({ roomId: roomId.trim(), status: 'active' });
      res.status(200).json(battle ?? null);
    } catch (error) {
      next(error);
    }
  });

  app.post('/battles', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId, name } = req.body || {};

      if (typeof roomId !== 'string' || !roomId.trim()) {
        return res.status(400).json({ message: 'Field roomId is required and must be a non-empty string' });
      }
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Field name is required and must be a non-empty string' });
      }

      const normalizedRoomId = roomId.trim();
      const activeBattle = await battleModel.findOne({ roomId: normalizedRoomId, status: 'active' });
      if (activeBattle) {
        return res.status(409).json({
          message: 'A battle is already active for this room',
          activeBattleId: activeBattle.id
        });
      }

      let battle: BattleLike;
      try {
        battle = await battleModel.create({
          roomId: normalizedRoomId,
          name: name.trim(),
          status: 'active',
          playerSide: { characterIds: [], bonuses: [] },
          monsterSide: { monsters: [], bonuses: [] },
          result: null,
          concludedAt: null
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          const existingBattle = await battleModel.findOne({ roomId: normalizedRoomId, status: 'active' });
          return res.status(409).json({
            message: 'A battle is already active for this room',
            activeBattleId: existingBattle?.id
          });
        }

        throw error;
      }

      try {
        await publisher.publish(
          createBattleStartedEventPayload({
            roomId: battle.roomId,
            battleId: battle.id
          })
        );
      } catch (error) {
        console.error('Failed to publish battle_started event', error);
      }

      res.status(201).json(battle);
    } catch (error) {
      next(error);
    }
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[battle-service] unhandled error', { message: err.message, name: err.name });
    res.status(502).json({ message: 'Unexpected error' });
  });

  return app;
}
