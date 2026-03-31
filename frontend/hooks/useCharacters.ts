import {
  Character,
  CharacterUpdatePayload,
  CharacterWritePayload,
  createCharacter,
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
  refresh: () => Promise<void>;
  create: (payload: Omit<CharacterWritePayload, 'roomId'>) => Promise<Character>;
  update: (characterId: string, payload: CharacterUpdatePayload) => Promise<Character>;
}

const ENSURE_CHARACTER_COOLDOWN_MS = 5000;
const LOCAL_UPDATE_SUPPRESSION_WINDOW_MS = 2000;

const getCharactersQueryKey = (roomId: string | undefined): readonly ['characters', string | undefined] => ['characters', roomId];

type CharactersMutationContext = {
  previousCharacters: Character[];
};

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  );
}

function pruneExpiredLocalUpdateMarkers(markers: Map<string, number>, now: number): void {
  markers.forEach((updatedAt, characterId) => {
    if (now - updatedAt > LOCAL_UPDATE_SUPPRESSION_WINDOW_MS) {
      markers.delete(characterId);
    }
  });
}

export function useRoomCharacters(roomId: string | undefined, userProfile: UserProfileInterface): UseRoomCharactersResult {
  const queryClient = useQueryClient();
  const isEnsuringCurrentCharacterRef = useRef(false);
  const lastEnsureAttemptAtRef = useRef(0);
  const recentLocalUpdateByCharacterRef = useRef<Map<string, number>>(new Map());
  const [realtimeUpdateSignals, setRealtimeUpdateSignals] = useState<Record<string, number>>({});

  // Set up WebSocket connection for real-time updates
  const { isConnected, subscribe } = useRoomWebSocket(
    roomId,
    userProfile.id,
    Boolean(roomId && userProfile.id)
  );

  const charactersQuery = useQuery({
    queryKey: getCharactersQueryKey(roomId),
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
      const queryKey = getCharactersQueryKey(roomId);
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
        queryClient.setQueryData(getCharactersQueryKey(roomId), context.previousCharacters);
      }
    },
    onSuccess: (createdCharacter) => {
      queryClient.setQueryData<Character[]>(getCharactersQueryKey(roomId), (currentCharacters = []) => {
        const nonOptimisticCharacters = currentCharacters.filter((character) => !character.id.startsWith('temp-'));
        return [...nonOptimisticCharacters, createdCharacter];
      });
    },
    onSettled: () => {
      pruneExpiredLocalUpdateMarkers(recentLocalUpdateByCharacterRef.current, Date.now());
      void queryClient.invalidateQueries({ queryKey: getCharactersQueryKey(roomId) });
    },
  });

  const updateMutation = useMutation<Character, Error, { characterId: string; payload: CharacterUpdatePayload }, CharactersMutationContext>({
    mutationFn: async ({ characterId, payload }) => {
      return updateCharacter(characterId, payload);
    },
    onMutate: async ({ characterId, payload }) => {
      recentLocalUpdateByCharacterRef.current.set(characterId, Date.now());
      const queryKey = getCharactersQueryKey(roomId);
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
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(getCharactersQueryKey(roomId), context.previousCharacters);
      }
    },
    onSuccess: (updatedCharacter) => {
      queryClient.setQueryData<Character[]>(getCharactersQueryKey(roomId), (currentCharacters = []) =>
        currentCharacters.map((character) => (character.id === updatedCharacter.id ? updatedCharacter : character))
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: getCharactersQueryKey(roomId) });
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
          void queryClient.invalidateQueries({ queryKey: getCharactersQueryKey(roomId) });
          break;
        }
        case 'character_updated': {
          const updatedCharacterId = event.event_body.characterId;
          pruneExpiredLocalUpdateMarkers(recentLocalUpdateByCharacterRef.current, Date.now());
          const lastLocalUpdateAt = recentLocalUpdateByCharacterRef.current.get(updatedCharacterId);
          const isLikelyOwnUpdate =
            typeof lastLocalUpdateAt === 'number' &&
            Date.now() - lastLocalUpdateAt <= LOCAL_UPDATE_SUPPRESSION_WINDOW_MS;

          if (isLikelyOwnUpdate) {
            recentLocalUpdateByCharacterRef.current.delete(updatedCharacterId);
            void queryClient.invalidateQueries({ queryKey: getCharactersQueryKey(roomId) });
            break;
          }

          const currentCharacters = queryClient.getQueryData<Character[]>(getCharactersQueryKey(roomId)) ?? [];
          const updatedCharacter = currentCharacters.find((character) => character.id === updatedCharacterId);

          if (updatedCharacter && updatedCharacter.userId !== userProfile.id) {
            setRealtimeUpdateSignals((currentSignals) => ({
              ...currentSignals,
              [updatedCharacterId]: (currentSignals[updatedCharacterId] ?? 0) + 1,
            }));
          }

          // Refetch all characters when one is updated
          void queryClient.invalidateQueries({ queryKey: getCharactersQueryKey(roomId) });
          break;
        }
        case 'character_deleted': {
          // Refetch all characters when one is deleted
          void queryClient.invalidateQueries({ queryKey: getCharactersQueryKey(roomId) });
          break;
        }
      }
    });

    return unsubscribe;
  }, [isConnected, queryClient, roomId, subscribe, userProfile.id]);

  useEffect(() => {
    setRealtimeUpdateSignals({});
    recentLocalUpdateByCharacterRef.current.clear();
  }, [roomId]);

  const create = useCallback(
    async (payload: Omit<CharacterWritePayload, 'roomId'>) => {
      return createMutation.mutateAsync(payload);
    },
    [createMutation]
  );

  const update = useCallback(async (characterId: string, payload: CharacterUpdatePayload) => {
    return updateMutation.mutateAsync({ characterId, payload });
  }, [updateMutation]);

  const characters = charactersQuery.data ?? [];
  const hasCompletedInitialFetch = charactersQuery.isFetchedAfterMount && !charactersQuery.isFetching;

  useEffect(() => {
    if (!roomId || !userProfile.id || !hasCompletedInitialFetch) {
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
      refresh,
      create,
      update,
    }),
    [characters, create, errorMessage, isLoading, realtimeUpdateSignals, refresh, update]
  );
}
