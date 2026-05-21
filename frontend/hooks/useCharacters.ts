import {
  Character,
  CharacterUpdatePayload,
  CharacterWritePayload,
  createCharacter,
  deleteCharacter,
  getCharactersByRoom,
  updateCharacter,
} from '@/api/characters';
import { useRoomWebSocket } from '@/hooks/useRoomWebSocket';
import { UserProfileInterface } from '@/hooks/useUser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseRoomCharactersResult {
  characters: Character[];
  realtimeUpdateSignals: Record<string, number>;
  isLoading: boolean;
  errorMessage: string | null;
  isCreateBlocked: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
  isTimedOut: boolean;
  refresh: () => Promise<void>;
  reconnect: () => Promise<void>;
  create: (payload: Omit<CharacterWritePayload, 'roomId'>) => Promise<Character>;
  update: (characterId: string, payload: CharacterUpdatePayload) => Promise<Character>;
  remove: (characterId: string) => Promise<void>;
}

const ENSURE_CHARACTER_COOLDOWN_MS = 5000;

const getCharactersQueryKey = (roomId: string | undefined): readonly ['characters', string | undefined] => ['characters', roomId];

type CharactersMutationContext = {
  previousCharacters: Character[];
  deletedCharacter?: Character;
  deletedCharacterIndex?: number;
  previousAutoCreateSuppressedForCurrentUser?: boolean;
};

type PendingLocalUpdateMarker = {
  inFlightCount: number;
  suppressibleEchoCount: number;
};

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  );
}

function recordPendingLocalUpdate(markers: Map<string, PendingLocalUpdateMarker>, characterId: string): void {
  const currentMarker = markers.get(characterId);
  markers.set(characterId, {
    inFlightCount: (currentMarker?.inFlightCount ?? 0) + 1,
    suppressibleEchoCount: (currentMarker?.suppressibleEchoCount ?? 0) + 1,
  });
}

function settlePendingLocalUpdate(markers: Map<string, PendingLocalUpdateMarker>, characterId: string): void {
  const currentMarker = markers.get(characterId);

  if (!currentMarker) {
    return;
  }

  const nextInFlightCount = Math.max(0, currentMarker.inFlightCount - 1);
  const nextSuppressibleEchoCount = Math.min(currentMarker.suppressibleEchoCount, nextInFlightCount);

  if (nextInFlightCount === 0 && nextSuppressibleEchoCount === 0) {
    markers.delete(characterId);
    return;
  }

  markers.set(characterId, {
    inFlightCount: nextInFlightCount,
    suppressibleEchoCount: nextSuppressibleEchoCount,
  });
}

function consumeSuppressibleEcho(markers: Map<string, PendingLocalUpdateMarker>, characterId: string): void {
  const currentMarker = markers.get(characterId);

  if (!currentMarker) {
    return;
  }

  const nextSuppressibleEchoCount = Math.max(0, currentMarker.suppressibleEchoCount - 1);

  if (currentMarker.inFlightCount === 0 && nextSuppressibleEchoCount === 0) {
    markers.delete(characterId);
    return;
  }

  markers.set(characterId, {
    inFlightCount: currentMarker.inFlightCount,
    suppressibleEchoCount: nextSuppressibleEchoCount,
  });
}

export function useRoomCharacters(roomId: string | undefined, userProfile: UserProfileInterface): UseRoomCharactersResult {
  const queryClient = useQueryClient();
  const charactersQueryKey = useMemo(() => getCharactersQueryKey(roomId), [roomId]);
  const webSocketOptions = useMemo(
    () => ({
      onOpen: () => {
        void queryClient.invalidateQueries({ queryKey: charactersQueryKey });
      },
    }),
    [charactersQueryKey, queryClient]
  );
  const isEnsuringCurrentCharacterRef = useRef(false);
  const lastEnsureAttemptAtRef = useRef(0);
  const autoCreateSuppressedForCurrentUserRef = useRef(false);
  const pendingCurrentUserDeleteCountRef = useRef(0);
  const recentLocalUpdateByCharacterRef = useRef<Map<string, PendingLocalUpdateMarker>>(new Map());
  const [realtimeUpdateSignals, setRealtimeUpdateSignals] = useState<Record<string, number>>({});
  const [isCreateBlocked, setIsCreateBlocked] = useState(false);

  // Set up WebSocket connection for real-time updates
  const { isConnected, isReconnecting, isTimedOut, reconnect, subscribe } = useRoomWebSocket(
    roomId,
    userProfile.id,
    Boolean(roomId && userProfile.id),
    webSocketOptions
  );

  const charactersQuery = useQuery({
    queryKey: charactersQueryKey,
    queryFn: async ({ signal }) => {
      if (!roomId) {
        return [] as Character[];
      }

      return getCharactersByRoom(roomId, signal);
    },
    enabled: Boolean(roomId)
  });

  const createMutation = useMutation<Character, Error, Omit<CharacterWritePayload, 'roomId'>, CharactersMutationContext>({
    mutationFn: async (payload) => {
      if (!roomId) {
        throw new Error('Room ID is required to create a character');
      }

      return createCharacter({ ...payload, roomId });
    },
    onMutate: async (payload) => {
      const queryKey = charactersQueryKey;
      await queryClient.cancelQueries({ queryKey });
      const previousCharacters = queryClient.getQueryData<Character[]>(queryKey) ?? [];

      const optimisticCharacter: Character = {
        id: `temp-${Date.now()}`,
        roomId: roomId ?? '',
        userId: payload.userId ?? null,
        nickname: payload.nickname,
        avatar: payload.avatar,
        color: payload.color,
        level: payload.level ?? 1,
        power: payload.power ?? 0,
        class: payload.class ?? [],
        race: payload.race ?? [],
        gender: payload.gender ?? [],
      };

      queryClient.setQueryData<Character[]>(queryKey, [...previousCharacters, optimisticCharacter]);

      return { previousCharacters };
    },
    onError: (_error, _payload, context) => {
      if (context) {
        queryClient.setQueryData(charactersQueryKey, context.previousCharacters);
      }
    },
    onSuccess: (createdCharacter) => {
      if (createdCharacter.userId === userProfile.id) {
        autoCreateSuppressedForCurrentUserRef.current = false;
        lastEnsureAttemptAtRef.current = Date.now();
      }

      queryClient.setQueryData<Character[]>(charactersQueryKey, (currentCharacters = []) => {
        const nonOptimisticCharacters = currentCharacters.filter((character) => !character.id.startsWith('temp-'));
        return [...nonOptimisticCharacters, createdCharacter];
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: charactersQueryKey });
    },
  });

  const updateMutation = useMutation<Character, Error, { characterId: string; payload: CharacterUpdatePayload }, CharactersMutationContext>({
    mutationFn: async ({ characterId, payload }) => {
      return updateCharacter(characterId, payload);
    },
    onMutate: async ({ characterId, payload }) => {
      recordPendingLocalUpdate(recentLocalUpdateByCharacterRef.current, characterId);
      const queryKey = charactersQueryKey;
      await queryClient.cancelQueries({ queryKey });
      const previousCharacters = queryClient.getQueryData<Character[]>(queryKey) ?? [];

      queryClient.setQueryData<Character[]>(queryKey, (currentCharacters = []) =>
        currentCharacters.map((character) =>
          character.id === characterId
            ? {
              ...character,
              userId: payload.userId ?? character.userId,
              nickname: payload.nickname ?? character.nickname,
              avatar: payload.avatar ?? character.avatar,
              color: payload.color ?? character.color,
              level: payload.level ?? character.level,
              power: payload.power ?? character.power,
              class: payload.class ?? character.class,
              race: payload.race ?? character.race,
              gender: payload.gender ?? character.gender,
            }
            : character
        )
      );

      return { previousCharacters };
    },
    onError: (_error, variables, context) => {
      settlePendingLocalUpdate(recentLocalUpdateByCharacterRef.current, variables.characterId);
      if (context) {
        queryClient.setQueryData(charactersQueryKey, context.previousCharacters);
      }
    },
    onSuccess: (updatedCharacter) => {
      settlePendingLocalUpdate(recentLocalUpdateByCharacterRef.current, updatedCharacter.id);
      queryClient.setQueryData<Character[]>(charactersQueryKey, (currentCharacters = []) =>
        currentCharacters.map((character) => (character.id === updatedCharacter.id ? updatedCharacter : character))
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: charactersQueryKey });
    },
  });

  const deleteMutation = useMutation<void, Error, { characterId: string }, CharactersMutationContext>({
    mutationFn: async ({ characterId }) => {
      await deleteCharacter(characterId);
    },
    onMutate: async ({ characterId }) => {
      const queryKey = charactersQueryKey;
      await queryClient.cancelQueries({ queryKey });
      const previousCharacters = queryClient.getQueryData<Character[]>(queryKey) ?? [];
      const deletedCharacter = previousCharacters.find((character) => character.id === characterId);
      const deletedCharacterIndex = previousCharacters.findIndex((character) => character.id === characterId);
      const previousAutoCreateSuppressedForCurrentUser = autoCreateSuppressedForCurrentUserRef.current;

      if (deletedCharacter?.userId === userProfile.id) {
        autoCreateSuppressedForCurrentUserRef.current = true;
        pendingCurrentUserDeleteCountRef.current += 1;
        setIsCreateBlocked(true);
      }

      queryClient.setQueryData<Character[]>(queryKey, (currentCharacters = []) =>
        currentCharacters.filter((character) => character.id !== characterId)
      );

      return { previousCharacters, deletedCharacter, deletedCharacterIndex, previousAutoCreateSuppressedForCurrentUser };
    },
    onError: (_error, _variables, context) => {
      autoCreateSuppressedForCurrentUserRef.current = context?.previousAutoCreateSuppressedForCurrentUser ?? false;

      if (context?.deletedCharacter) {
        const deletedCharacter = context.deletedCharacter;
        queryClient.setQueryData<Character[]>(charactersQueryKey, (currentCharacters = []) => {
          const alreadyPresent = currentCharacters.some((character) => character.id === deletedCharacter.id);

          if (alreadyPresent) {
            return currentCharacters;
          }

          const insertionIndex = (context.deletedCharacterIndex ?? -1) >= 0
            ? Math.min(context.deletedCharacterIndex!, currentCharacters.length)
            : currentCharacters.length;

          return [
            ...currentCharacters.slice(0, insertionIndex),
            deletedCharacter,
            ...currentCharacters.slice(insertionIndex),
          ];
        });
        return;
      }

      if (context?.previousCharacters) {
        queryClient.setQueryData(charactersQueryKey, context.previousCharacters);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.deletedCharacter?.userId === userProfile.id) {
        pendingCurrentUserDeleteCountRef.current = Math.max(0, pendingCurrentUserDeleteCountRef.current - 1);
        setIsCreateBlocked(pendingCurrentUserDeleteCountRef.current > 0);
      } else if (context === undefined) {
        // onMutate threw — refs may be in an inconsistent state; reset to safe defaults
        autoCreateSuppressedForCurrentUserRef.current = false;
        pendingCurrentUserDeleteCountRef.current = 0;
        setIsCreateBlocked(false);
      }

      void queryClient.invalidateQueries({ queryKey: charactersQueryKey });
    },
  });

  // Subscribe to WebSocket events for real-time character updates
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const unsubscribe = subscribe((event) => {
      switch (event.event) {
        case 'character_created': {
          // Refetch all characters when a new one is created
          void queryClient.invalidateQueries({ queryKey: charactersQueryKey });
          break;
        }
        case 'character_updated': {
          const updatedCharacterId = event.event_body.characterId;
          const lastLocalUpdateAt = recentLocalUpdateByCharacterRef.current.get(updatedCharacterId);
          const isLikelyOwnUpdate =
            typeof lastLocalUpdateAt?.suppressibleEchoCount === 'number' && lastLocalUpdateAt.suppressibleEchoCount > 0;

          if (isLikelyOwnUpdate) {
            consumeSuppressibleEcho(recentLocalUpdateByCharacterRef.current, updatedCharacterId);
            void queryClient.invalidateQueries({ queryKey: charactersQueryKey });
            break;
          }

          setRealtimeUpdateSignals((currentSignals) => ({
            ...currentSignals,
            [updatedCharacterId]: (currentSignals[updatedCharacterId] ?? 0) + 1,
          }));

          // Refetch all characters when one is updated
          void queryClient.invalidateQueries({ queryKey: charactersQueryKey });
          break;
        }
        case 'character_deleted': {
          // Refetch all characters when one is deleted
          void queryClient.invalidateQueries({ queryKey: charactersQueryKey });
          break;
        }
      }
    });

    return unsubscribe;
  }, [charactersQueryKey, isConnected, queryClient, subscribe, userProfile.id]);

  useEffect(() => {
    setRealtimeUpdateSignals({});
    autoCreateSuppressedForCurrentUserRef.current = false;
    pendingCurrentUserDeleteCountRef.current = 0;
    recentLocalUpdateByCharacterRef.current.clear();
    setIsCreateBlocked(false);
  }, [roomId]);

  const create = useCallback(
    async (payload: Omit<CharacterWritePayload, 'roomId'>) => {
      if (
        payload.userId === userProfile.id &&
        pendingCurrentUserDeleteCountRef.current > 0
      ) {
        throw new Error('Please wait for character removal to finish before creating a new one');
      }

      return createMutation.mutateAsync(payload);
    },
    [createMutation, userProfile.id]
  );

  const update = useCallback(async (characterId: string, payload: CharacterUpdatePayload) => {
    return updateMutation.mutateAsync({ characterId, payload });
  }, [updateMutation]);

  const remove = useCallback(async (characterId: string) => {
    await deleteMutation.mutateAsync({ characterId });
  }, [deleteMutation]);

  const characters = charactersQuery.data ?? [];
  const hasCompletedInitialFetch = charactersQuery.isFetchedAfterMount && !charactersQuery.isFetching;

  useEffect(() => {
    if (!roomId || !userProfile.id || !hasCompletedInitialFetch) {
      return;
    }

    if (autoCreateSuppressedForCurrentUserRef.current) {
      return;
    }

    const hasCurrentCharacter = characters.some((character) => character.userId === userProfile.id);
    if (hasCurrentCharacter || isEnsuringCurrentCharacterRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastEnsureAttemptAtRef.current < ENSURE_CHARACTER_COOLDOWN_MS) {
      return;
    }

    lastEnsureAttemptAtRef.current = now;
    isEnsuringCurrentCharacterRef.current = true;

    void createMutation
      .mutateAsync({
        userId: userProfile.id,
        nickname: userProfile.nickname,
        avatar: userProfile.avatar,
        color: '#9966FF',
        level: 1,
        power: 0,
        race: ['Human'],
        gender: ['male'],
        class: [],
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return;
        }

        console.error('Failed to auto-create current character:', error);
      })
      .finally(() => {
        isEnsuringCurrentCharacterRef.current = false;
      });
  }, [characters, createMutation, hasCompletedInitialFetch, roomId, userProfile.avatar, userProfile.id, userProfile.nickname]);

  const refresh = useCallback(async () => {
    await charactersQuery.refetch();
  }, [charactersQuery]);

  const errorMessage =
    (charactersQuery.error instanceof Error && charactersQuery.error.message) ||
    (createMutation.error instanceof Error && createMutation.error.message) ||
    (updateMutation.error instanceof Error && updateMutation.error.message) ||
    null;

  const isLoading =
    charactersQuery.isLoading ||
    (charactersQuery.isFetching && characters.length === 0);

  return useMemo(
    () => ({
      characters,
      realtimeUpdateSignals,
      isLoading,
      errorMessage,
      isCreateBlocked,
      isConnected,
      isReconnecting,
      isTimedOut,
      refresh,
      reconnect,
      create,
      update,
      remove,
    }),
    [characters, create, errorMessage, isConnected, isCreateBlocked, isLoading, isReconnecting, isTimedOut, realtimeUpdateSignals, reconnect, refresh, remove, update]
  );
}
