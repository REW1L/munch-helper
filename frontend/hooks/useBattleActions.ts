import { Battle, PatchBattlePayload, StartBattlePayload, patchBattle, startBattle } from '@/api/battles';
import { getBattleQueryKey } from '@/hooks/useRoomBattle';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface UseBattleActionsResult {
  start: (payload: StartBattlePayload) => Promise<Battle>;
  patch: (battleId: string, payload: PatchBattlePayload) => Promise<Battle>;
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

  const patchMutation = useMutation({
    mutationFn: async ({ battleId, payload }: { battleId: string; payload: PatchBattlePayload }) => patchBattle(battleId, payload),
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

  const patch = useCallback(
    async (battleId: string, payload: PatchBattlePayload) => {
      return patchMutation.mutateAsync({ battleId, payload });
    },
    [patchMutation]
  );

  return useMemo(
    () => ({
      start,
      patch,
      isLoading: startMutation.isPending || patchMutation.isPending,
      errorMessage:
        (startMutation.error instanceof Error ? startMutation.error.message : null) ||
        (patchMutation.error instanceof Error ? patchMutation.error.message : null),
    }),
    [patch, patchMutation.error, patchMutation.isPending, start, startMutation.error, startMutation.isPending]
  );
}
