import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { concludeBattle, patchBattle, startBattle } from '@/api/battles';
import { ApiError } from '@/api/http';
import { useBattleActions } from '@/hooks/useBattleActions';

vi.mock('@/api/battles', () => ({
  concludeBattle: vi.fn(),
  patchBattle: vi.fn(),
  startBattle: vi.fn(),
}));

const mockConcludeBattle = vi.mocked(concludeBattle);
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
    mockConcludeBattle.mockReset();
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

  it('concludes a battle and invalidates the room battle query', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mockConcludeBattle.mockResolvedValue({
      id: 'battle-1',
      roomId: 'room-1',
      name: 'Battle',
      status: 'concluded',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: 'players_win',
      concludedAt: '2026-05-17T12:00:00.000Z',
    });

    const { result } = renderHook(() => useBattleActions('room-1'), { wrapper });

    await act(async () => {
      await result.current.conclude('battle-1', 'players_win');
    });

    expect(mockConcludeBattle).toHaveBeenCalledWith('battle-1', 'players_win');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['battle', 'room-1'] });
  });

  it('surfaces conclude conflicts through errorMessage', async () => {
    mockConcludeBattle.mockRejectedValueOnce(new ApiError('Battle is not active', 409, { message: 'Battle is not active' }));
    const { result } = renderHook(() => useBattleActions('room-1'), { wrapper });

    await act(async () => {
      await expect(result.current.conclude('battle-1', 'players_win')).rejects.toThrow('Battle is not active');
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Battle is not active');
    });
  });
});
