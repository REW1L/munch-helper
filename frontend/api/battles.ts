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
