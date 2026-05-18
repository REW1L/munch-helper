import { Battle, StartBattlePayload, startBattle } from '@/api/battles';
import { getBattleQueryKey } from '@/hooks/useRoomBattle';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface UseBattleActionsResult {
  start: (payload: StartBattlePayload) => Promise<Battle>;
  isLoading: boolean;
  errorMessage: string | null;
}

export function useBattleActions(roomId: string | undefined): UseBattleActionsResult {
  const queryClient = useQueryClient();
  const battleQueryKey = useMemo(() => getBattleQueryKey(roomId), [roomId]);

  const startMutation = useMutation({
    mutationFn: async (payload: StartBattlePayload) => startBattle(payload),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: battleQueryKey });
    },
  });

  const start = useCallback(
    async (payload: StartBattlePayload) => {
      return startMutation.mutateAsync(payload);
    },
    [startMutation]
  );

  return useMemo(
    () => ({
      start,
      isLoading: startMutation.isPending,
      errorMessage: startMutation.error instanceof Error ? startMutation.error.message : null,
    }),
    [start, startMutation.error, startMutation.isPending]
  );
}
