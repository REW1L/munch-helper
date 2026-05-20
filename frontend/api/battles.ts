import { apiRequest } from '@/api/http';

export type BattleStatus = 'active' | 'concluded' | 'discarded';
export type BattleResult = 'players_win' | 'monster_wins';

export interface BonusItem {
  id: string;
  value: number;
}

export interface MonsterItem {
  id: string;
  name: string;
  level: number;
}

export interface Battle {
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
  result: BattleResult | null;
  concludedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StartBattlePayload {
  roomId: string;
  name: string;
}

export type PlayerSide = Battle['playerSide'];
export type MonsterSide = Battle['monsterSide'];

export interface PatchBattlePayload {
  name?: string;
  playerSide?: PlayerSide;
  monsterSide?: MonsterSide;
}

export async function startBattle(payload: StartBattlePayload): Promise<Battle> {
  return apiRequest<Battle>('/battles', {
    method: 'POST',
    body: payload,
  });
}

export async function getActiveBattle(roomId: string, signal?: AbortSignal): Promise<Battle | null> {
  return apiRequest<Battle | null>(`/battles?roomId=${encodeURIComponent(roomId)}&status=active`, {
    signal,
  });
}

export async function patchBattle(battleId: string, payload: PatchBattlePayload): Promise<Battle> {
  const body: PatchBattlePayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    body.name = payload.name;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'playerSide')) {
    body.playerSide = payload.playerSide;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'monsterSide')) {
    body.monsterSide = payload.monsterSide;
  }

  return apiRequest<Battle>(`/battles/${encodeURIComponent(battleId)}`, {
    method: 'PATCH',
    body,
  });
}

export async function concludeBattle(battleId: string, result: BattleResult): Promise<Battle> {
  return apiRequest<Battle>(`/battles/${encodeURIComponent(battleId)}/conclude`, {
    method: 'POST',
    body: { result },
  });
}
