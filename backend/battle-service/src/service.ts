import { createApp, type BattleLike, type BattleModelLike } from './app';
import { Battle } from './models/Battle';
import { type BattleEventPublisher } from './publisher';

interface BuildBattleAppOptions {
  routePrefix?: string;
  publisher?: BattleEventPublisher;
}

const toBattleLike = (battle: any): BattleLike => ({
  id: battle.id,
  roomId: battle.roomId,
  name: battle.name,
  status: battle.status,
  playerSide: {
    characterIds: battle.playerSide?.characterIds ?? [],
    bonuses: battle.playerSide?.bonuses ?? []
  },
  monsterSide: {
    monsters: battle.monsterSide?.monsters ?? [],
    bonuses: battle.monsterSide?.bonuses ?? []
  },
  result: battle.result ?? null,
  concludedAt: battle.concludedAt ?? null,
  createdAt: battle.createdAt,
  updatedAt: battle.updatedAt
});

export function createBattleModel(): BattleModelLike {
  return {
    findOne: async (query) => {
      console.info('[battle-service] db find active battle', { query });
      const battle = await Battle.findOne(query);
      if (!battle) {
        return null;
      }
      return toBattleLike(battle);
    },
    findById: async (id) => {
      console.info('[battle-service] db find battle by id', { battleId: id });
      const battle = await Battle.findById(id);
      if (!battle) {
        console.info('[battle-service] db find battle by id not found', { battleId: id });
        return null;
      }
      return toBattleLike(battle);
    },
    create: async (payload) => {
      console.info('[battle-service] db create battle', {
        roomId: payload.roomId,
        name: payload.name
      });
      const battle = await Battle.create(payload);
      console.info('[battle-service] db create battle success', {
        battleId: battle.id,
        roomId: battle.roomId
      });
      return toBattleLike(battle);
    },
    findByIdAndUpdate: async (id, updates, options) => {
      console.info('[battle-service] db update battle', {
        battleId: id,
        updates: Object.keys(updates)
      });
      const battle = await Battle.findByIdAndUpdate(id, updates, options);
      if (!battle) {
        console.info('[battle-service] db update battle not found', { battleId: id });
        return null;
      }
      console.info('[battle-service] db update battle success', {
        battleId: battle.id,
        roomId: battle.roomId
      });
      return toBattleLike(battle);
    }
  };
}

export function buildBattleApp(options: BuildBattleAppOptions = {}) {
  console.info('[battle-service] building app', {
    routePrefix: options.routePrefix,
    publisher: options.publisher?.constructor.name || 'NoopBattleEventPublisher'
  });

  return createApp(createBattleModel(), {
    routePrefix: options.routePrefix,
    publisher: options.publisher
  });
}
