import {
  Character,
  CharacterUpdatePayload,
  CharacterWritePayload,
  createCharacter,
  getCharactersByRoom,
  updateCharacter,
} from '@/api/characters';
import { UserProfileInterface } from '@/hooks/useUser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseRoomCharactersResult {
  characters: Character[];
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  create: (payload: Omit<CharacterWritePayload, 'roomId'>) => Promise<Character>;
  update: (characterId: string, payload: CharacterUpdatePayload) => Promise<Character>;
}

const POLL_INTERVAL_MS = 5000;

export function useRoomCharacters(roomId: string | undefined, userProfile: UserProfileInterface): UseRoomCharactersResult {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
  const isEnsuringCurrentCharacterRef = useRef(false);

  const fetchCharacters = useCallback(
    async (silent: boolean = false) => {
      if (!roomId || isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const fetchedCharacters = await getCharactersByRoom(roomId);

        setCharacters(fetchedCharacters);
        setErrorMessage(null);

        const hasCurrentCharacter = fetchedCharacters.some((character) => character.userId === userProfile.id);

        if (!hasCurrentCharacter && userProfile.id && !isEnsuringCurrentCharacterRef.current) {
          isEnsuringCurrentCharacterRef.current = true;

          try {
            await createCharacter({
              roomId,
              userId: userProfile.id,
              nickname: userProfile.nickname,
              avatar: userProfile.avatar,
              color: '#9966FF',
              level: 1,
              power: 0,
              race: ['Human'],
              gender: ['male'],
              class: []
            });

            const refreshedCharacters = await getCharactersByRoom(roomId);
            setCharacters(refreshedCharacters);
          } finally {
            isEnsuringCurrentCharacterRef.current = false;
          }
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load characters');
      } finally {
        isFetchingRef.current = false;
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [roomId, userProfile.avatar, userProfile.id, userProfile.nickname]
  );

  useEffect(() => {
    setCharacters([]);
    setErrorMessage(null);
    setIsLoading(true);
    void fetchCharacters();

    const timer = setInterval(() => {
      void fetchCharacters(true);
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [fetchCharacters, roomId]);

  const create = useCallback(
    async (payload: Omit<CharacterWritePayload, 'roomId'>) => {
      if (!roomId) {
        throw new Error('Room ID is required to create a character');
      }

      const createdCharacter = await createCharacter({ ...payload, roomId });
      setCharacters((previousCharacters) => [...previousCharacters, createdCharacter]);
      return createdCharacter;
    },
    [roomId]
  );

  const update = useCallback(async (characterId: string, payload: CharacterUpdatePayload) => {
    const updatedCharacter = await updateCharacter(characterId, payload);
    setCharacters((previousCharacters) =>
      previousCharacters.map((character) =>
        character.id === updatedCharacter.id ? updatedCharacter : character
      )
    );
    return updatedCharacter;
  }, []);

  const refresh = useCallback(async () => {
    await fetchCharacters();
  }, [fetchCharacters]);

  return useMemo(
    () => ({
      characters,
      isLoading,
      errorMessage,
      refresh,
      create,
      update,
    }),
    [characters, create, errorMessage, isLoading, refresh, update]
  );
}
