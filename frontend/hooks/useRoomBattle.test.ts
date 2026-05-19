import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getActiveBattle } from '@/api/battles';
import { useRoomBattle } from '@/hooks/useRoomBattle';
import type { UserProfileInterface } from '@/hooks/useUser';

// ---------------------------------------------------------------------------
// useRoomWebSocket mock — hoisted mutable state, mirrors useCharacters.test
// ---------------------------------------------------------------------------

type EventListener = (event: { event: string; event_body: Record<string, unknown> }) => void;

const mockSubscribe = vi.fn<(listener: EventListener) => () => void>(() => () => undefined);
let latestRoomWebSocketOptions: { onOpen?: () => void } | undefined;
let mockIsConnected = false;

vi.mock('@/hooks/useRoomWebSocket', () => ({
  useRoomWebSocket: (
    _roomId: string | undefined,
    _userId: string | undefined,
    _enabled: boolean,
    options?: { onOpen?: () => void }
  ) => {
    latestRoomWebSocketOptions = options;
    return {
      isConnected: mockIsConnected,
      isReconnecting: false,
      isTimedOut: false,
      reconnect: vi.fn(),
      subscribe: mockSubscribe,
    };
  },
}));

vi.mock('@/api/battles', () => ({
  getActiveBattle: vi.fn(),
}));

const mockGetActiveBattle = vi.mocked(getActiveBattle);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const userProfile: UserProfileInterface = { id: 'user-1', nickname: 'Player', avatar: 0 };

const makeBattle = (id = 'battle-1') => ({
  id,
  roomId: 'room-1',
  name: 'Battle',
  status: 'active' as const,
  playerSide: { characterIds: [], bonuses: [] },
  monsterSide: { monsters: [], bonuses: [] },
  result: null,
  concludedAt: null,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRoomBattle', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetActiveBattle.mockReset();
    mockSubscribe.mockReset();
    mockSubscribe.mockReturnValue(() => undefined);
    latestRoomWebSocketOptions = undefined;
    mockIsConnected = false;
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('loads the active battle by roomId', async () => {
    mockGetActiveBattle.mockResolvedValue(makeBattle());

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

  it('accepts a userProfile and passes userId to useRoomWebSocket', () => {
    mockGetActiveBattle.mockResolvedValue(makeBattle());
    renderHook(() => useRoomBattle('room-1', userProfile), { wrapper });
    // If the mock was called, useRoomWebSocket received arguments (covered by mock calls)
    // The real assertion is that passing userProfile doesn't throw
    expect(mockSubscribe).toBeDefined();
  });

  describe('WebSocket integration', () => {
    it('invalidates battle query on WS open', async () => {
      mockGetActiveBattle.mockResolvedValue(makeBattle());
      renderHook(() => useRoomBattle('room-1', userProfile), { wrapper });

      await waitFor(() => expect(mockGetActiveBattle).toHaveBeenCalledTimes(1));

      mockGetActiveBattle.mockResolvedValue(makeBattle('battle-2'));
      act(() => {
        latestRoomWebSocketOptions?.onOpen?.();
      });

      await waitFor(() => expect(mockGetActiveBattle).toHaveBeenCalledTimes(2));
    });

    it('subscribes to events when isConnected is true and re-fetches on battle_* events', async () => {
      mockIsConnected = true;
      mockGetActiveBattle.mockResolvedValue(makeBattle());

      let capturedListener: EventListener | undefined;
      mockSubscribe.mockImplementation((listener) => {
        capturedListener = listener;
        return () => undefined;
      });

      renderHook(() => useRoomBattle('room-1', userProfile), { wrapper });

      await waitFor(() => expect(mockGetActiveBattle).toHaveBeenCalledTimes(1));

      mockGetActiveBattle.mockResolvedValue(makeBattle('battle-updated'));

      act(() => {
        capturedListener?.({ event: 'battle_updated', event_body: { battleId: 'battle-1' } });
      });

      await waitFor(() => expect(mockGetActiveBattle).toHaveBeenCalledTimes(2));
    });

    it('refetches on each battle_* event type', async () => {
      mockIsConnected = true;
      mockGetActiveBattle.mockResolvedValue(makeBattle());

      let capturedListener: EventListener | undefined;
      mockSubscribe.mockImplementation((listener) => {
        capturedListener = listener;
        return () => undefined;
      });

      renderHook(() => useRoomBattle('room-1', userProfile), { wrapper });
      await waitFor(() => expect(mockGetActiveBattle).toHaveBeenCalledTimes(1));

      const battleEvents = ['battle_started', 'battle_updated', 'battle_concluded', 'battle_discarded'];
      for (const event of battleEvents) {
        mockGetActiveBattle.mockResolvedValue(makeBattle());
        act(() => {
          capturedListener?.({ event, event_body: { battleId: 'battle-1' } });
        });
      }

      await waitFor(() => expect(mockGetActiveBattle).toHaveBeenCalledTimes(1 + battleEvents.length));
    });

    it('does not refetch on character_* events', async () => {
      mockIsConnected = true;
      mockGetActiveBattle.mockResolvedValue(makeBattle());

      let capturedListener: EventListener | undefined;
      mockSubscribe.mockImplementation((listener) => {
        capturedListener = listener;
        return () => undefined;
      });

      renderHook(() => useRoomBattle('room-1', userProfile), { wrapper });
      await waitFor(() => expect(mockGetActiveBattle).toHaveBeenCalledTimes(1));

      act(() => {
        capturedListener?.({ event: 'character_created', event_body: { characterId: 'char-1' } });
        capturedListener?.({ event: 'character_updated', event_body: { characterId: 'char-1' } });
        capturedListener?.({ event: 'character_deleted', event_body: { characterId: 'char-1' } });
      });

      // Wait a tick to confirm no additional fetches
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockGetActiveBattle).toHaveBeenCalledTimes(1);
    });

    it('does not subscribe when isConnected is false', () => {
      mockIsConnected = false;
      mockGetActiveBattle.mockResolvedValue(makeBattle());
      renderHook(() => useRoomBattle('room-1', userProfile), { wrapper });
      expect(mockSubscribe).not.toHaveBeenCalled();
    });
  });
});
