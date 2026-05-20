import { beforeEach, describe, expect, it, vi } from 'vitest';

import { concludeBattle, discardBattle, getActiveBattle, patchBattle, startBattle } from '@/api/battles';
import { ApiError, apiRequest } from '@/api/http';

vi.mock('@/api/http', async () => {
  const actual = await vi.importActual<typeof import('@/api/http')>('@/api/http');
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

const mockApiRequest = vi.mocked(apiRequest);

describe('battles api', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it('starts a battle with the provided required name', async () => {
    mockApiRequest.mockResolvedValueOnce({
      id: 'battle-1',
      roomId: 'room-1',
      name: 'Battle 1',
      status: 'active',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null,
      concludedAt: null,
    });

    const battle = await startBattle({ roomId: 'room-1', name: 'Battle 1' });

    expect(mockApiRequest).toHaveBeenCalledWith('/battles', {
      method: 'POST',
      body: { roomId: 'room-1', name: 'Battle 1' },
    });
    expect(battle.id).toBe('battle-1');
  });

  it('gets active battle with URL-encoded roomId and supports null', async () => {
    const signal = new AbortController().signal;
    mockApiRequest.mockResolvedValueOnce(null);

    await expect(getActiveBattle('room/1', signal)).resolves.toBeNull();
    expect(mockApiRequest).toHaveBeenCalledWith('/battles?roomId=room%2F1&status=active', { signal });
  });

  it('surfaces 409 ApiError details for existing active battle routing', async () => {
    const conflict = new ApiError('A battle is already active for this room', 409, { activeBattleId: 'battle-1' });
    mockApiRequest.mockRejectedValueOnce(conflict);

    await expect(startBattle({ roomId: 'room-1', name: 'Battle 2' })).rejects.toMatchObject({
      status: 409,
      details: { activeBattleId: 'battle-1' },
    });
  });

  it('patches a battle with URL-encoded id and selective body', async () => {
    mockApiRequest.mockResolvedValueOnce({
      id: 'battle/1',
      roomId: 'room-1',
      name: 'Battle 1',
      status: 'active',
      playerSide: { characterIds: ['character-1'], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null,
      concludedAt: null,
    });

    await patchBattle('battle/1', {
      playerSide: { characterIds: ['character-1'], bonuses: [] },
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/battles/battle%2F1', {
      method: 'PATCH',
      body: {
        playerSide: { characterIds: ['character-1'], bonuses: [] },
      },
    });
  });

  it('surfaces 409 ApiError details for non-active battle patches', async () => {
    const conflict = new ApiError('Battle is not active', 409, { message: 'Battle is not active' });
    mockApiRequest.mockRejectedValueOnce(conflict);

    await expect(patchBattle('battle-1', { name: 'Updated' })).rejects.toMatchObject({
      status: 409,
      details: { message: 'Battle is not active' },
    });
  });

  it('concludes a battle with URL-encoded id and selected result', async () => {
    mockApiRequest.mockResolvedValueOnce({
      id: 'battle/1',
      roomId: 'room-1',
      name: 'Battle 1',
      status: 'concluded',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: 'players_win',
      concludedAt: '2026-05-17T12:00:00.000Z',
    });

    await concludeBattle('battle/1', 'players_win');

    expect(mockApiRequest).toHaveBeenCalledWith('/battles/battle%2F1/conclude', {
      method: 'POST',
      body: { result: 'players_win' },
    });
  });

  it('surfaces 409 and 400 ApiErrors for conclude without retrying in the caller', async () => {
    const conflict = new ApiError('Battle is not active', 409, { message: 'Battle is not active' });
    const badRequest = new ApiError('Field result is required and must be "players_win" or "monster_wins"', 400, {
      message: 'Field result is required and must be "players_win" or "monster_wins"',
    });

    mockApiRequest.mockRejectedValueOnce(conflict);
    await expect(concludeBattle('battle-1', 'players_win')).rejects.toMatchObject({ status: 409 });
    expect(mockApiRequest).toHaveBeenCalledTimes(1);

    mockApiRequest.mockRejectedValueOnce(badRequest);
    await expect(concludeBattle('battle-1', 'monster_wins')).rejects.toMatchObject({ status: 400 });
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
  });

  it('discards a battle with URL-encoded id and no body', async () => {
    mockApiRequest.mockResolvedValueOnce({
      id: 'battle/1',
      roomId: 'room-1',
      name: 'Battle 1',
      status: 'discarded',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null,
      concludedAt: null,
    });

    await discardBattle('battle/1');

    expect(mockApiRequest).toHaveBeenCalledWith('/battles/battle%2F1', {
      method: 'DELETE',
      retryCount: 0,
    });
    expect(mockApiRequest.mock.calls[0][1]).not.toHaveProperty('body');
  });

  it('surfaces 409 ApiErrors for discard without retrying in the caller', async () => {
    const conflict = new ApiError('Battle is not active', 409, { message: 'Battle is not active' });
    mockApiRequest.mockRejectedValueOnce(conflict);

    await expect(discardBattle('battle-1')).rejects.toMatchObject({ status: 409 });
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });
});
