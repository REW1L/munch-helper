import { Battle, BattleResult, PatchBattlePayload, StartBattlePayload, concludeBattle, discardBattle, patchBattle, startBattle } from '@/api/battles';
import { getBattleQueryKey } from '@/hooks/useRoomBattle';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface UseBattleActionsResult {
  start: (payload: StartBattlePayload) => Promise<Battle>;
  patch: (battleId: string, payload: PatchBattlePayload) => Promise<Battle>;
  conclude: (battleId: string, result: BattleResult) => Promise<Battle>;
  discard: (battleId: string) => Promise<Battle>;
  isLoading: boolean;
  isSaving: boolean;
  isDiscarding: boolean;
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

  const concludeMutation = useMutation({
    mutationFn: async ({ battleId, result }: { battleId: string; result: BattleResult }) => concludeBattle(battleId, result),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: battleQueryKey });
    },
  });

  const discardMutation = useMutation({
    mutationFn: async (battleId: string) => discardBattle(battleId),
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

  const conclude = useCallback(
    async (battleId: string, result: BattleResult) => {
      return concludeMutation.mutateAsync({ battleId, result });
    },
    [concludeMutation]
  );

  const discard = useCallback(
    async (battleId: string) => {
      return discardMutation.mutateAsync(battleId);
    },
    [discardMutation]
  );

  return useMemo(
    () => ({
      start,
      patch,
      conclude,
      discard,
      isLoading: startMutation.isPending || patchMutation.isPending || concludeMutation.isPending || discardMutation.isPending,
      isSaving: patchMutation.isPending,
      isDiscarding: discardMutation.isPending,
      errorMessage:
        (startMutation.error instanceof Error ? startMutation.error.message : null) ||
        (patchMutation.error instanceof Error ? patchMutation.error.message : null) ||
        (concludeMutation.error instanceof Error ? concludeMutation.error.message : null) ||
        (discardMutation.error instanceof Error ? discardMutation.error.message : null),
    }),
    [
      conclude,
      concludeMutation.error,
      concludeMutation.isPending,
      discard,
      discardMutation.error,
      discardMutation.isPending,
      patch,
      patchMutation.error,
      patchMutation.isPending,
      start,
      startMutation.error,
      startMutation.isPending
    ]
  );
}
