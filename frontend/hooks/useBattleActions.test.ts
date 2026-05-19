import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { patchBattle, startBattle } from '@/api/battles';
import { useBattleActions } from '@/hooks/useBattleActions';

vi.mock('@/api/battles', () => ({
  patchBattle: vi.fn(),
  startBattle: vi.fn(),
}));

const mockPatchBattle = vi.mocked(patchBattle);
const mockStartBattle = vi.mocked(startBattle);

describe('useBattleActions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockPatchBattle.mockReset();
    mockStartBattle.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('starts a battle and invalidates the room battle query', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mockStartBattle.mockResolvedValue({
      id: 'battle-1',
      roomId: 'room-1',
      name: 'Battle',
      status: 'active',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null,
      concludedAt: null,
    });

    const { result } = renderHook(() => useBattleActions('room-1'), { wrapper });

    await act(async () => {
      await result.current.start({ roomId: 'room-1', name: 'Battle' });
    });

    expect(mockStartBattle).toHaveBeenCalledWith({ roomId: 'room-1', name: 'Battle' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['battle', 'room-1'] });
  });

  it('exposes mutation errors', async () => {
    mockStartBattle.mockRejectedValueOnce(new Error('Start failed'));
    const { result } = renderHook(() => useBattleActions('room-1'), { wrapper });

    await act(async () => {
      await expect(result.current.start({ roomId: 'room-1', name: 'Battle' })).rejects.toThrow('Start failed');
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Start failed');
    });
  });

  it('patches a battle and invalidates the room battle query', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mockPatchBattle.mockResolvedValue({
      id: 'battle-1',
      roomId: 'room-1',
      name: 'Battle',
      status: 'active',
      playerSide: { characterIds: ['character-1'], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null,
      concludedAt: null,
    });

    const { result } = renderHook(() => useBattleActions('room-1'), { wrapper });

    await act(async () => {
      await result.current.patch('battle-1', {
        playerSide: { characterIds: ['character-1'], bonuses: [] },
      });
    });

    expect(mockPatchBattle).toHaveBeenCalledWith('battle-1', {
      playerSide: { characterIds: ['character-1'], bonuses: [] },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['battle', 'room-1'] });
  });
});
