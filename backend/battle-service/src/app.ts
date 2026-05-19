import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import {
  type BattleEventPublisher,
  NoopBattleEventPublisher,
  createBattleStartedEventPayload,
  createBattleUpdatedEventPayload
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
  findById: (id: string) => Promise<BattleLike | null>;
  create: (payload: CreateBattlePayload) => Promise<BattleLike>;
  findByIdAndUpdate: (
    id: string,
    updates: PatchBattlePayload,
    options: { new: boolean; runValidators: boolean }
  ) => Promise<BattleLike | null>;
}

export interface PlayerSidePayload {
  characterIds: string[];
  bonuses: BonusItem[];
}

export interface MonsterSidePayload {
  monsters: MonsterItem[];
  bonuses: BonusItem[];
}

export interface PatchBattlePayload {
  name?: string;
  playerSide?: PlayerSidePayload;
  monsterSide?: MonsterSidePayload;
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

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);

const toParamString = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
};

const hasDuplicateIds = (items: Array<{ id: string }>): boolean => {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      return true;
    }
    ids.add(item.id);
  }
  return false;
};

const parseBonuses = (value: unknown): BonusItem[] | string => {
  if (!Array.isArray(value)) {
    return 'Field bonuses must be an array';
  }

  const bonuses: BonusItem[] = [];
  for (const item of value) {
    if (!isPlainObject(item) || !isNonEmptyString(item.id) || !isInteger(item.value)) {
      return 'Each bonus must include a non-empty id and an integer value';
    }
    bonuses.push({ id: item.id.trim(), value: item.value });
  }

  if (hasDuplicateIds(bonuses)) {
    return 'Bonus ids must be unique within a side';
  }

  return bonuses;
};

const parsePlayerSide = (value: unknown): PlayerSidePayload | string => {
  if (!isPlainObject(value) || !Array.isArray(value.characterIds) || !Array.isArray(value.bonuses)) {
    return 'Field playerSide must include characterIds and bonuses';
  }

  const characterIds: string[] = [];
  const seenCharacterIds = new Set<string>();
  for (const characterId of value.characterIds) {
    if (!isNonEmptyString(characterId)) {
      return 'Field playerSide.characterIds must contain only non-empty strings';
    }
    const trimmed = characterId.trim();
    if (seenCharacterIds.has(trimmed)) {
      return 'Field playerSide.characterIds must not contain duplicates';
    }
    seenCharacterIds.add(trimmed);
    characterIds.push(trimmed);
  }

  const bonuses = parseBonuses(value.bonuses);
  if (typeof bonuses === 'string') {
    return bonuses;
  }

  return { characterIds, bonuses };
};

const parseMonsterSide = (value: unknown): MonsterSidePayload | string => {
  if (!isPlainObject(value) || !Array.isArray(value.monsters) || !Array.isArray(value.bonuses)) {
    return 'Field monsterSide must include monsters and bonuses';
  }

  const monsters: MonsterItem[] = [];
  for (const item of value.monsters) {
    if (!isPlainObject(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.name) || !isInteger(item.level) || item.level < 0) {
      return 'Each monster must include a non-empty id, non-empty name, and non-negative integer level';
    }
    monsters.push({ id: item.id.trim(), name: item.name.trim(), level: item.level });
  }

  if (hasDuplicateIds(monsters)) {
    return 'Monster ids must be unique within a side';
  }

  const bonuses = parseBonuses(value.bonuses);
  if (typeof bonuses === 'string') {
    return bonuses;
  }

  return { monsters, bonuses };
};

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

  app.patch('/battles/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const battleId = toParamString(req.params.id);
      const body = isPlainObject(req.body) ? req.body : {};
      const updates: PatchBattlePayload = {};

      console.info('[battle-service] update battle request', {
        battleId,
        bodyKeys: Object.keys(body)
      });

      if (hasOwn(body, 'name')) {
        if (!isNonEmptyString(body.name)) {
          return res.status(400).json({ message: 'Field name must be a non-empty string when provided' });
        }
        updates.name = body.name.trim();
      }

      if (hasOwn(body, 'playerSide')) {
        const playerSide = parsePlayerSide(body.playerSide);
        if (typeof playerSide === 'string') {
          return res.status(400).json({ message: playerSide });
        }
        updates.playerSide = playerSide;
      }

      if (hasOwn(body, 'monsterSide')) {
        const monsterSide = parseMonsterSide(body.monsterSide);
        if (typeof monsterSide === 'string') {
          return res.status(400).json({ message: monsterSide });
        }
        updates.monsterSide = monsterSide;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update' });
      }

      const existing = await battleModel.findById(battleId);
      if (!existing) {
        return res.status(404).json({ message: 'Battle not found' });
      }
      if (existing.status !== 'active') {
        return res.status(409).json({ message: 'Battle is not active' });
      }

      const battle = await battleModel.findByIdAndUpdate(battleId, updates, {
        new: true,
        runValidators: true
      });

      if (!battle) {
        return res.status(404).json({ message: 'Battle not found' });
      }

      try {
        await publisher.publish(
          createBattleUpdatedEventPayload({
            roomId: battle.roomId,
            battleId: battle.id
          })
        );
      } catch (error) {
        console.error('Failed to publish battle_updated event', error);
      }

      res.status(200).json(battle);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'CastError') {
        return res.status(404).json({ message: 'Battle not found' });
      }
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
