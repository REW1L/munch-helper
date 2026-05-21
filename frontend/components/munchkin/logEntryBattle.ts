import type { BattleResult, BattleStatus, BonusItem, MonsterItem } from '@/api/battles';

export interface BattleSnapshot {
  id: string;
  name?: string;
  status?: BattleStatus;
  result?: BattleResult | null;
  playerSide?: {
    characterIds?: string[];
    bonuses?: BonusItem[];
  };
  monsterSide?: {
    monsters?: MonsterItem[];
    bonuses?: BonusItem[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBattleStatus(value: unknown): value is BattleStatus {
  return value === 'active' || value === 'concluded' || value === 'discarded';
}

function isBattleResult(value: unknown): value is BattleResult {
  return value === 'players_win' || value === 'monster_wins';
}

function narrowBonuses(value: unknown): BonusItem[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seenIds = new Set<string>();
  return value.flatMap((item) => {
    if (!isRecord(item) || !nonEmptyString(item.id) || !Number.isFinite(item.value) || seenIds.has(item.id)) {
      return [];
    }

    seenIds.add(item.id);
    return [{ id: item.id, value: item.value as number }];
  });
}

function narrowCharacterIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return Array.from(new Set(value.filter(nonEmptyString)));
}

function narrowMonsters(value: unknown): MonsterItem[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seenIds = new Set<string>();
  return value.flatMap((item) => {
    if (!isRecord(item) || !nonEmptyString(item.id) || seenIds.has(item.id)) {
      return [];
    }

    seenIds.add(item.id);
    return [{
      id: item.id,
      name: nonEmptyString(item.name) ? item.name : '',
      level: typeof item.level === 'number' ? item.level : Number.NaN,
    }];
  });
}

export function narrowBattlePayload(payload: unknown): BattleSnapshot | null {
  if (!isRecord(payload) || !isRecord(payload.battle)) {
    return null;
  }

  const { battle } = payload;
  const id = nonEmptyString(battle.id) ? battle.id : null;

  if (!id) {
    return null;
  }
  const playerSide = isRecord(battle.playerSide)
    ? {
      characterIds: narrowCharacterIds(battle.playerSide.characterIds),
      bonuses: narrowBonuses(battle.playerSide.bonuses),
    }
    : undefined;
  const monsterSide = isRecord(battle.monsterSide)
    ? {
      monsters: narrowMonsters(battle.monsterSide.monsters),
      bonuses: narrowBonuses(battle.monsterSide.bonuses),
    }
    : undefined;

  return {
    id,
    name: nonEmptyString(battle.name) ? battle.name.trim() : undefined,
    status: isBattleStatus(battle.status) ? battle.status : undefined,
    result: battle.result === null ? null : isBattleResult(battle.result) ? battle.result : undefined,
    playerSide,
    monsterSide,
  };
}

export function hasUsableBattlePayload(payload: unknown): boolean {
  const battle = narrowBattlePayload(payload);

  if (!battle) {
    return false;
  }

  return Boolean(battle.name || battle.playerSide || battle.monsterSide);
}

export function getBattleResultLabel(result: unknown, emptyLabel = 'Concluded'): string {
  if (result === 'players_win') {
    return 'Players Win';
  }

  if (result === 'monster_wins') {
    return 'Monster Wins';
  }

  return emptyLabel;
}

export function formatSignedValue(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
