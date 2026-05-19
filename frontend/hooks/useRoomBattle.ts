import { Battle, getActiveBattle } from '@/api/battles';
import { useRoomWebSocket } from '@/hooks/useRoomWebSocket';
import { UserProfileInterface } from '@/hooks/useUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

interface UseRoomBattleResult {
  battle: Battle | null;
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
}

export const getBattleQueryKey = (roomId: string | undefined): readonly ['battle', string | undefined] => ['battle', roomId];

export function useRoomBattle(
  roomId: string | undefined,
  userProfile?: UserProfileInterface
): UseRoomBattleResult {
  const queryClient = useQueryClient();
  const battleQueryKey = useMemo(() => getBattleQueryKey(roomId), [roomId]);

  const webSocketOptions = useMemo(
    () => ({
      onOpen: () => {
        void queryClient.invalidateQueries({ queryKey: battleQueryKey });
      },
    }),
    [battleQueryKey, queryClient]
  );

  const userId = userProfile?.id;
  const { isConnected, subscribe } = useRoomWebSocket(
    roomId,
    userId,
    Boolean(roomId && userId),
    webSocketOptions
  );

  const battleQuery = useQuery({
    queryKey: battleQueryKey,
    queryFn: async ({ signal }) => {
      if (!roomId) {
        return null;
      }

      return getActiveBattle(roomId, signal);
    },
    enabled: Boolean(roomId)
  });

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const unsubscribe = subscribe((event) => {
      if (event.event.startsWith('battle_')) {
        void queryClient.invalidateQueries({ queryKey: battleQueryKey });
      }
    });

    return unsubscribe;
  }, [battleQueryKey, isConnected, queryClient, subscribe]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: battleQueryKey });
    await queryClient.refetchQueries({ queryKey: battleQueryKey });
  }, [battleQueryKey, queryClient]);

  return useMemo(
    () => ({
      battle: battleQuery.data ?? null,
      isLoading: battleQuery.isLoading || (battleQuery.isFetching && !battleQuery.data),
      errorMessage: battleQuery.error instanceof Error ? battleQuery.error.message : null,
      refresh,
    }),
    [battleQuery.data, battleQuery.error, battleQuery.isFetching, battleQuery.isLoading, refresh]
  );
}
