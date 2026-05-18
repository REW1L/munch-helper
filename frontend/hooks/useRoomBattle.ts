import { Battle, getActiveBattle } from '@/api/battles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface UseRoomBattleResult {
  battle: Battle | null;
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
}

export const getBattleQueryKey = (roomId: string | undefined): readonly ['battle', string | undefined] => ['battle', roomId];

export function useRoomBattle(roomId: string | undefined): UseRoomBattleResult {
  const queryClient = useQueryClient();
  const battleQueryKey = useMemo(() => getBattleQueryKey(roomId), [roomId]);

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

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: battleQueryKey });
    await battleQuery.refetch();
  }, [battleQuery, battleQueryKey, queryClient]);

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
