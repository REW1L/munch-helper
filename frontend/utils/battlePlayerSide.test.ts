import { describe, expect, it } from 'vitest';

import type { Character } from '@/api/characters';
import { computePlayerTotal, reconcilePlayerParticipants } from '@/utils/battlePlayerSide';

const characters: Character[] = [
  { id: 'character-1', roomId: 'room-1', userId: 'user-1', nickname: 'Alice', avatar: 0, level: 4, power: 6, class: [], race: [], gender: [], color: '#FFFFFF' },
  { id: 'character-2', roomId: 'room-1', userId: 'user-2', nickname: 'Bob', avatar: 1, level: 2, power: 3, class: [], race: [], gender: [], color: '#FFFFFF' },
  { id: 'character-3', roomId: 'room-1', userId: 'user-3', nickname: 'Cora', avatar: 2, level: 7, power: 8, class: [], race: [], gender: [], color: '#FFFFFF' },
];

describe('battlePlayerSide', () => {
  it('returns all selected characters as active when they are resolved', () => {
    expect(reconcilePlayerParticipants(['character-2', 'character-1'], characters)).toEqual({
      active: [
        { id: 'character-2', character: characters[1] },
        { id: 'character-1', character: characters[0] },
      ],
      removed: [],
    });
  });

  it('preserves order and collects removed ids when some characters are missing', () => {
    expect(reconcilePlayerParticipants(['character-3', 'missing-1', 'character-1', 'missing-2'], characters)).toEqual({
      active: [
        { id: 'character-3', character: characters[2] },
        { id: 'character-1', character: characters[0] },
      ],
      removed: ['missing-1', 'missing-2'],
    });
  });

  it('handles empty character ids', () => {
    expect(reconcilePlayerParticipants([], characters)).toEqual({ active: [], removed: [] });
  });

  it('deduplicates selected ids defensively', () => {
    expect(reconcilePlayerParticipants(['character-1', 'character-1', 'missing-1', 'missing-1'], characters)).toEqual({
      active: [{ id: 'character-1', character: characters[0] }],
      removed: ['missing-1'],
    });
  });

  it('computes player totals from active level, power, and signed bonuses only', () => {
    const reconciled = reconcilePlayerParticipants(['character-1', 'missing-1', 'character-2'], characters);

    expect(computePlayerTotal(reconciled.active, [
      { id: 'bonus-1', value: 5 },
      { id: 'bonus-2', value: -2 },
    ])).toBe(18);
  });

  it('treats non-finite levels, powers, and bonus values as zero so a stray NaN/null cannot invert the comparison label', () => {
    const corruptedCharacter = { ...characters[0], level: Number.NaN, power: Number.NaN } as Character;
    const total = computePlayerTotal(
      [{ character: corruptedCharacter }, { character: characters[1] }],
      [
        { id: 'bonus-1', value: Number.NaN },
        { id: 'bonus-2', value: 3 },
      ],
    );

    expect(Number.isFinite(total)).toBe(true);
    expect(total).toBe(8);
  });
});
