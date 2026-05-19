import type { BonusItem } from '@/api/battles';
import type { Character } from '@/api/characters';

export interface ActivePlayerParticipant {
  id: string;
  character: Character;
}

export interface ReconciledPlayerParticipants {
  active: ActivePlayerParticipant[];
  removed: string[];
}

export function reconcilePlayerParticipants(
  characterIds: string[],
  roomCharacters: Character[]
): ReconciledPlayerParticipants {
  const charactersById = new Map(roomCharacters.map((character) => [character.id, character]));
  const seenCharacterIds = new Set<string>();
  const active: ActivePlayerParticipant[] = [];
  const removed: string[] = [];

  for (const id of characterIds) {
    if (seenCharacterIds.has(id)) {
      continue;
    }

    seenCharacterIds.add(id);
    const character = charactersById.get(id);
    if (character) {
      active.push({ id, character });
    } else {
      removed.push(id);
    }
  }

  return { active, removed };
}

export function computePlayerTotal(active: Pick<ActivePlayerParticipant, 'character'>[], bonuses: BonusItem[]): number {
  const characterLevelTotal = active.reduce(
    (total, participant) => total + (Number.isFinite(participant.character.level) ? participant.character.level : 0),
    0,
  );
  const bonusTotal = bonuses.reduce(
    (total, bonus) => total + (Number.isFinite(bonus.value) ? bonus.value : 0),
    0,
  );
  return characterLevelTotal + bonusTotal;
}
