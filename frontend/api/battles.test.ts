import { describe, expect, it, vi } from 'vitest';

import { getActiveBattle, startBattle } from '@/api/battles';
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
});
