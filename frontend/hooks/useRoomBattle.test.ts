import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getActiveBattle } from '@/api/battles';
import { useRoomBattle } from '@/hooks/useRoomBattle';

vi.mock('@/api/battles', () => ({
  getActiveBattle: vi.fn(),
}));

const mockGetActiveBattle = vi.mocked(getActiveBattle);

describe('useRoomBattle', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockGetActiveBattle.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('loads the active battle by roomId', async () => {
    mockGetActiveBattle.mockResolvedValue({
      id: 'battle-1',
      roomId: 'room-1',
      name: 'Battle',
      status: 'active',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null,
      concludedAt: null,
    });

    const { result } = renderHook(() => useRoomBattle('room-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.battle?.id).toBe('battle-1');
    });
    expect(mockGetActiveBattle).toHaveBeenCalledWith('room-1', expect.any(AbortSignal));
  });

  it('does not fetch without a roomId and exposes errors', async () => {
    const { result, rerender } = renderHook(({ roomId }) => useRoomBattle(roomId), {
      initialProps: { roomId: undefined as string | undefined },
      wrapper,
    });

    expect(result.current.battle).toBeNull();
    expect(mockGetActiveBattle).not.toHaveBeenCalled();

    mockGetActiveBattle.mockRejectedValueOnce(new Error('Load failed'));
    rerender({ roomId: 'room-2' });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Load failed');
    });
  });
});
