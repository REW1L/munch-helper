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

const MAX_CREATE_ATTEMPTS = 2;

const extractMongoErrorCode = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const candidate = error as {
    code?: unknown;
    cause?: { code?: unknown };
    writeErrors?: Array<{ code?: unknown } | undefined>;
  };

  if (typeof candidate.code === 'number') {
    return candidate.code;
  }
  if (candidate.cause && typeof candidate.cause.code === 'number') {
    return candidate.cause.code;
  }
  const writeErrorCode = candidate.writeErrors?.[0]?.code;
  if (typeof writeErrorCode === 'number') {
    return writeErrorCode;
  }

  return undefined;
};

// Mongo surfaces the duplicate-key code on the top-level error for a single
// create, but wraps it (cause / writeErrors) for bulk/version errors — the
// concurrent double-start race must map to 409, never a 502.
const isDuplicateKeyError = (error: unknown): boolean => extractMongoErrorCode(error) === 11000;

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
      const { roomId, status } = req.query;

      if (typeof roomId !== 'string' || !roomId.trim()) {
        return res.status(400).json({ message: 'Query parameter roomId is required' });
      }

      // 5.1 only serves the active-battle query; any other status filter has no
      // match yet, so resolve to null rather than leaking the active battle.
      if (status !== undefined && status !== 'active') {
        return res.status(200).json(null);
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
      const trimmedName = name.trim();

      let battle: BattleLike | null = null;
      for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS && !battle; attempt += 1) {
        const activeBattle = await battleModel.findOne({ roomId: normalizedRoomId, status: 'active' });
        if (activeBattle) {
          return res.status(409).json({
            message: 'A battle is already active for this room',
            activeBattleId: activeBattle.id
          });
        }

        try {
          battle = await battleModel.create({
            roomId: normalizedRoomId,
            name: trimmedName,
            status: 'active',
            playerSide: { characterIds: [], bonuses: [] },
            monsterSide: { monsters: [], bonuses: [] },
            result: null,
            concludedAt: null
          });
        } catch (error) {
          if (isDuplicateKeyError(error)) {
            // Lost the unique-active-index race. Re-check on the next iteration:
            // if the winning battle is still active we return its id (409); if it
            // has already gone we retry the create instead of returning an empty 409.
            continue;
          }

          throw error;
        }
      }

      if (!battle) {
        return res.status(409).json({ message: 'A battle is already active for this room' });
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

  app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Invalid JSON body' });
    }

    console.error('[battle-service] unhandled error', { message: err.message, name: err.name });
    res.status(502).json({ message: 'Unexpected error' });
  });

  return app;
}
