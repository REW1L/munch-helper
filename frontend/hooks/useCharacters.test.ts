import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type Character,
  createCharacter,
  deleteCharacter,
  getCharactersByRoom,
  updateCharacter,
} from '@/api/characters';
import { useRoomCharacters } from '@/hooks/useCharacters';
import type { UserProfileInterface } from '@/hooks/useUser';

const mockSubscribe = vi.fn<(listener: (event: { event: string; event_body: { characterId: string } }) => void) => () => void>(
  () => () => undefined
);
let latestRoomWebSocketOptions: { onOpen?: () => void } | undefined;

vi.mock('@/api/characters', () => ({
  createCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
  getCharactersByRoom: vi.fn(),
  updateCharacter: vi.fn(),
}));

vi.mock('@/hooks/useRoomWebSocket', () => ({
  useRoomWebSocket: (
    _roomId: string | undefined,
    _userId: string | undefined,
    _enabled: boolean,
    options?: { onOpen?: () => void }
  ) => ({
    isConnected: true,
    isTimedOut: false,
    reconnect: vi.fn(),
    subscribe: mockSubscribe,
    ...(() => {
      latestRoomWebSocketOptions = options;
      return {};
    })(),
  }),
}));

const mockGetCharactersByRoom = vi.mocked(getCharactersByRoom);
const mockCreateCharacter = vi.mocked(createCharacter);
const mockDeleteCharacter = vi.mocked(deleteCharacter);
const mockUpdateCharacter = vi.mocked(updateCharacter);

describe('useRoomCharacters', () => {
  const roomId = 'room-42';
  const userProfile: UserProfileInterface = {
    id: 'user-1',
    nickname: 'Player One',
    avatar: 1,
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    mockGetCharactersByRoom.mockReset();
    mockCreateCharacter.mockReset();
    mockDeleteCharacter.mockReset();
    mockUpdateCharacter.mockReset();
    mockSubscribe.mockReset();
    mockSubscribe.mockImplementation(() => () => undefined);
    latestRoomWebSocketOptions = undefined;
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('creates and updates room characters while keeping query state in sync', async () => {
    const initialCharacter = {
      id: 'char-initial',
      roomId,
      userId: userProfile.id,
      nickname: 'Knight',
      avatar: 1,
      color: '#AA5500',
      level: 2,
      power: 3,
      race: ['Human'],
      gender: ['male'],
      class: ['Warrior'],
    };

    const createdCharacter = {
      id: 'char-created',
      roomId,
      userId: userProfile.id,
      nickname: 'Wizard',
      avatar: 2,
      color: '#0044AA',
      level: 1,
      power: 1,
      race: ['Elf'],
      gender: ['female'],
      class: ['Wizard'],
    };

    const updatedCharacter = {
      ...createdCharacter,
      nickname: 'Wizard Prime',
      level: 3,
      power: 5,
    };

    mockGetCharactersByRoom
      .mockResolvedValueOnce([initialCharacter])
      .mockResolvedValueOnce([initialCharacter, createdCharacter])
      .mockResolvedValue([initialCharacter, updatedCharacter]);
    mockCreateCharacter.mockResolvedValue(createdCharacter);
    mockUpdateCharacter.mockResolvedValue(updatedCharacter);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(1);
      expect(result.current.characters[0]?.nickname).toBe('Knight');
    });

    await act(async () => {
      await result.current.create({
        userId: userProfile.id,
        nickname: 'Wizard',
        avatar: 2,
        color: '#0044AA',
        level: 1,
        power: 1,
        race: ['Elf'],
        gender: ['female'],
        class: ['Wizard'],
      });
    });

    await waitFor(() => {
      expect(result.current.characters.some((character) => character.id === 'char-created')).toBe(true);
      expect(result.current.characters.some((character) => character.nickname === 'Wizard')).toBe(true);
    });

    expect(mockCreateCharacter).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId,
        nickname: 'Wizard',
      })
    );

    await act(async () => {
      await result.current.update('char-created', {
        nickname: 'Wizard Prime',
        level: 3,
        power: 5,
      });
    });

    await waitFor(() => {
      expect(result.current.characters.some((character) => character.nickname === 'Wizard Prime')).toBe(true);
    });

    expect(mockUpdateCharacter).toHaveBeenCalledWith(
      'char-created',
      expect.objectContaining({
        nickname: 'Wizard Prime',
        level: 3,
        power: 5,
      })
    );
  });

  it('removes characters and keeps query state in sync', async () => {
    const initialCharacters = [
      {
        id: 'char-self',
        roomId,
        userId: userProfile.id,
        nickname: 'Hero',
        avatar: 1,
        color: '#AA5500',
        level: 2,
        power: 3,
        race: ['Human'],
        gender: ['male'],
        class: ['Warrior'],
      },
      {
        id: 'char-other',
        roomId,
        userId: 'user-2',
        nickname: 'Rogue',
        avatar: 2,
        color: '#0088CC',
        level: 4,
        power: 1,
        race: ['Elf'],
        gender: ['female'],
        class: ['Thief'],
      },
    ];

    mockGetCharactersByRoom
      .mockResolvedValueOnce(initialCharacters)
      .mockResolvedValue([initialCharacters[0]]);
    mockDeleteCharacter.mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(2);
    });

    await act(async () => {
      await result.current.remove('char-other');
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(1);
      expect(result.current.characters[0]?.id).toBe('char-self');
    });

    expect(mockDeleteCharacter).toHaveBeenCalledWith('char-other');
  });

  it('refreshes room characters when the WebSocket opens after reconnect', async () => {
    const initialCharacter = {
      id: 'char-self',
      roomId,
      userId: userProfile.id,
      nickname: 'Hero',
      avatar: 1,
      color: '#AA5500',
      level: 2,
      power: 3,
      race: ['Human'],
      gender: ['male'],
      class: ['Warrior'],
    };

    const reconnectedCharacter = {
      ...initialCharacter,
      level: 3,
    };

    mockGetCharactersByRoom
      .mockResolvedValueOnce([initialCharacter])
      .mockResolvedValue([reconnectedCharacter]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters[0]?.level).toBe(2);
    });

    act(() => {
      latestRoomWebSocketOptions?.onOpen?.();
    });

    await waitFor(() => {
      expect(result.current.characters[0]?.level).toBe(3);
    });
  });

  it('does not auto-recreate the current user character after an intentional self-delete', async () => {
    const initialCharacters = [
      {
        id: 'char-self',
        roomId,
        userId: userProfile.id,
        nickname: 'Hero',
        avatar: 1,
        color: '#AA5500',
        level: 2,
        power: 3,
        race: ['Human'],
        gender: ['male'],
        class: ['Warrior'],
      },
      {
        id: 'char-other',
        roomId,
        userId: 'user-2',
        nickname: 'Rogue',
        avatar: 2,
        color: '#0088CC',
        level: 4,
        power: 1,
        race: ['Elf'],
        gender: ['female'],
        class: ['Thief'],
      },
    ];

    mockGetCharactersByRoom
      .mockResolvedValueOnce(initialCharacters)
      .mockResolvedValue([initialCharacters[1]]);
    mockDeleteCharacter.mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(2);
    });

    await act(async () => {
      await result.current.remove('char-self');
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(1);
      expect(result.current.characters[0]?.id).toBe('char-other');
    });

    await waitFor(() => {
      expect(mockDeleteCharacter).toHaveBeenCalledWith('char-self');
    });

    expect(mockCreateCharacter).not.toHaveBeenCalled();
  });

  it('blocks creating a replacement current-user character while self-delete is still in flight', async () => {
    const selfCharacter: Character = {
      id: 'char-self',
      roomId,
      userId: userProfile.id,
      nickname: 'Hero',
      avatar: 1,
      color: '#AA5500',
      level: 2,
      power: 3,
      race: ['Human'],
      gender: ['male'],
      class: ['Warrior'],
    };
    const otherCharacter: Character = {
      id: 'char-other',
      roomId,
      userId: 'user-2',
      nickname: 'Rogue',
      avatar: 2,
      color: '#0088CC',
      level: 4,
      power: 1,
      race: ['Elf'],
      gender: ['female'],
      class: ['Thief'],
    };
    const replacementCharacter: Character = {
      id: 'char-replacement',
      roomId,
      userId: userProfile.id,
      nickname: 'Replacement',
      avatar: 3,
      color: '#11AA77',
      level: 1,
      power: 0,
      race: ['Human'],
      gender: ['female'],
      class: [],
    };

    let resolveDelete!: () => void;
    mockGetCharactersByRoom
      .mockResolvedValueOnce([selfCharacter, otherCharacter])
      .mockResolvedValue([otherCharacter]);
    mockDeleteCharacter.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );
    mockCreateCharacter.mockResolvedValue(replacementCharacter);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(2);
    });

    let pendingDelete!: Promise<void>;
    await act(async () => {
      pendingDelete = result.current.remove('char-self');
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isCreateBlocked).toBe(true);
      expect(result.current.characters.some((character) => character.id === 'char-self')).toBe(false);
    });

    await expect(
      result.current.create({
        userId: userProfile.id,
        nickname: 'Replacement',
        avatar: 3,
        color: '#11AA77',
        level: 1,
        power: 0,
        race: ['Human'],
        gender: ['female'],
        class: [],
      })
    ).rejects.toThrow('Please wait for character removal to finish before creating a new one');
    expect(mockCreateCharacter).not.toHaveBeenCalled();

    await act(async () => {
      resolveDelete();
      await pendingDelete;
    });

    await waitFor(() => {
      expect(result.current.isCreateBlocked).toBe(false);
    });

    await act(async () => {
      await result.current.create({
        userId: userProfile.id,
        nickname: 'Replacement',
        avatar: 3,
        color: '#11AA77',
        level: 1,
        power: 0,
        race: ['Human'],
        gender: ['female'],
        class: [],
      });
    });

    expect(mockCreateCharacter).toHaveBeenCalledTimes(1);
  });

  it('preserves newer local mutations when a delete rollback restores the removed character', async () => {
    const selfCharacter: Character = {
      id: 'char-self',
      roomId,
      userId: userProfile.id,
      nickname: 'Hero',
      avatar: 1,
      color: '#AA5500',
      level: 2,
      power: 3,
      race: ['Human'],
      gender: ['male'],
      class: ['Warrior'],
    };
    const otherCharacter: Character = {
      id: 'char-other',
      roomId,
      userId: 'user-2',
      nickname: 'Rogue',
      avatar: 2,
      color: '#0088CC',
      level: 4,
      power: 1,
      race: ['Elf'],
      gender: ['female'],
      class: ['Thief'],
    };

    let rejectDelete!: (reason?: unknown) => void;
    mockGetCharactersByRoom.mockResolvedValueOnce([selfCharacter, otherCharacter]);
    mockDeleteCharacter.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectDelete = reject;
        })
    );
    mockUpdateCharacter.mockResolvedValue({
      ...selfCharacter,
      power: 9,
    });

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(2);
    });

    let pendingDelete: Promise<void> | undefined;
    await act(async () => {
      pendingDelete = result.current.remove('char-other').catch(() => undefined);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.characters.map((character) => character.id)).toEqual(['char-self']);
    });

    await act(async () => {
      await result.current.update('char-self', { power: 9 });
    });

    await waitFor(() => {
      expect(result.current.characters.find((character) => character.id === 'char-self')?.power).toBe(9);
    });

    await act(async () => {
      rejectDelete(new Error('delete failed'));
      await pendingDelete;
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(2);
      expect(result.current.characters.find((character) => character.id === 'char-self')?.power).toBe(9);
      expect(result.current.characters.some((character) => character.id === 'char-other')).toBe(true);
    });

    invalidateQueriesSpy.mockRestore();
  });

  it('raises realtime update signals for websocket character updates, including the current user card', async () => {
    const selfCharacter = {
      id: 'char-self',
      roomId,
      userId: userProfile.id,
      nickname: 'Hero',
      avatar: 1,
      color: '#AA5500',
      level: 2,
      power: 3,
      race: ['Human'],
      gender: ['male'],
      class: ['Warrior'],
    };
    const otherCharacter = {
      id: 'char-other',
      roomId,
      userId: 'user-2',
      nickname: 'Rogue',
      avatar: 2,
      color: '#0088CC',
      level: 4,
      power: 1,
      race: ['Elf'],
      gender: ['female'],
      class: ['Thief'],
    };
    const updatedOtherCharacter = {
      ...otherCharacter,
      power: 2,
    };

    let listener: ((event: { event: string; event_body: { characterId: string } }) => void) | undefined;
    mockSubscribe.mockImplementation((callback: (event: { event: string; event_body: { characterId: string } }) => void) => {
      listener = callback;
      return () => undefined;
    });
    mockGetCharactersByRoom.mockResolvedValue([selfCharacter, otherCharacter]);
    mockUpdateCharacter.mockResolvedValue(updatedOtherCharacter);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(2);
    });

    act(() => {
      listener?.({ event: 'character_updated', event_body: { characterId: 'char-other' } });
    });

    await waitFor(() => {
      expect(result.current.realtimeUpdateSignals['char-other']).toBe(1);
    });

    act(() => {
      listener?.({ event: 'character_updated', event_body: { characterId: 'char-self' } });
    });

    await waitFor(() => {
      expect(result.current.realtimeUpdateSignals['char-self']).toBe(1);
    });

    await act(async () => {
      await result.current.update('char-other', { power: 2 });
    });

    act(() => {
      listener?.({ event: 'character_updated', event_body: { characterId: 'char-other' } });
    });

    await waitFor(() => {
      expect(result.current.realtimeUpdateSignals['char-other']).toBe(2);
    });
  });

  it('suppresses websocket echoes only while a local update for that character is still in flight', async () => {
    const selfCharacter = {
      id: 'char-self',
      roomId,
      userId: userProfile.id,
      nickname: 'Hero',
      avatar: 1,
      color: '#AA5500',
      level: 2,
      power: 3,
      race: ['Human'],
      gender: ['male'],
      class: ['Warrior'],
    };
    const otherCharacter = {
      id: 'char-other',
      roomId,
      userId: 'user-2',
      nickname: 'Rogue',
      avatar: 2,
      color: '#0088CC',
      level: 4,
      power: 1,
      race: ['Elf'],
      gender: ['female'],
      class: ['Thief'],
    };
    const updatedOtherCharacter = {
      ...otherCharacter,
      power: 2,
    };
    let resolveUpdate!: (value: typeof updatedOtherCharacter) => void;

    let listener: ((event: { event: string; event_body: { characterId: string } }) => void) | undefined;
    mockSubscribe.mockImplementation((callback: (event: { event: string; event_body: { characterId: string } }) => void) => {
      listener = callback;
      return () => undefined;
    });
    mockGetCharactersByRoom.mockResolvedValue([selfCharacter, otherCharacter]);
    mockUpdateCharacter.mockImplementation(
      () =>
        new Promise<typeof updatedOtherCharacter>((resolve) => {
          resolveUpdate = resolve;
        })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(2);
    });

    let pendingUpdate: Promise<Character>;
    await act(async () => {
      pendingUpdate = result.current.update('char-other', { power: 2 });
      await Promise.resolve();
    });

    act(() => {
      listener?.({ event: 'character_updated', event_body: { characterId: 'char-other' } });
    });

    expect(result.current.realtimeUpdateSignals['char-other']).toBeUndefined();

    await act(async () => {
      resolveUpdate(updatedOtherCharacter);
      await pendingUpdate!;
    });

    await waitFor(() => {
      expect(mockUpdateCharacter).toHaveBeenCalledTimes(1);
    });
  });

  it('does not suppress a later remote update when no websocket echo arrived before the local mutation settled', async () => {
    const selfCharacter = {
      id: 'char-self',
      roomId,
      userId: userProfile.id,
      nickname: 'Hero',
      avatar: 1,
      color: '#AA5500',
      level: 2,
      power: 3,
      race: ['Human'],
      gender: ['male'],
      class: ['Warrior'],
    };
    const otherCharacter = {
      id: 'char-other',
      roomId,
      userId: 'user-2',
      nickname: 'Rogue',
      avatar: 2,
      color: '#0088CC',
      level: 4,
      power: 1,
      race: ['Elf'],
      gender: ['female'],
      class: ['Thief'],
    };
    const updatedOtherCharacter = {
      ...otherCharacter,
      power: 2,
    };

    let listener: ((event: { event: string; event_body: { characterId: string } }) => void) | undefined;
    mockSubscribe.mockImplementation((callback: (event: { event: string; event_body: { characterId: string } }) => void) => {
      listener = callback;
      return () => undefined;
    });
    mockGetCharactersByRoom.mockResolvedValue([selfCharacter, otherCharacter]);
    mockUpdateCharacter.mockResolvedValue(updatedOtherCharacter);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(2);
    });

    await act(async () => {
      await result.current.update('char-other', { power: 2 });
    });

    act(() => {
      listener?.({ event: 'character_updated', event_body: { characterId: 'char-other' } });
    });

    await waitFor(() => {
      expect(result.current.realtimeUpdateSignals['char-other']).toBe(1);
    });
  });

  it('preserves a realtime signal when the update arrives before the character is present in cache', async () => {
    const selfCharacter = {
      id: 'char-self',
      roomId,
      userId: userProfile.id,
      nickname: 'Hero',
      avatar: 1,
      color: '#AA5500',
      level: 2,
      power: 3,
      race: ['Human'],
      gender: ['male'],
      class: ['Warrior'],
    };
    const lateCharacter = {
      id: 'char-late',
      roomId,
      userId: 'user-2',
      nickname: 'Late Rogue',
      avatar: 2,
      color: '#0088CC',
      level: 4,
      power: 1,
      race: ['Elf'],
      gender: ['female'],
      class: ['Thief'],
    };

    let listener: ((event: { event: string; event_body: { characterId: string } }) => void) | undefined;
    mockSubscribe.mockImplementation((callback: (event: { event: string; event_body: { characterId: string } }) => void) => {
      listener = callback;
      return () => undefined;
    });
    mockGetCharactersByRoom
      .mockResolvedValueOnce([selfCharacter])
      .mockResolvedValue([selfCharacter, lateCharacter]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(1);
    });

    act(() => {
      listener?.({ event: 'character_updated', event_body: { characterId: 'char-late' } });
    });

    await waitFor(() => {
      expect(result.current.realtimeUpdateSignals['char-late']).toBe(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.characters.some((character) => character.id === 'char-late')).toBe(true);
      expect(result.current.realtimeUpdateSignals['char-late']).toBe(1);
    });
  });

  it('suppresses one websocket echo per overlapping in-flight local update on the same character', async () => {
    const selfCharacter = {
      id: 'char-self',
      roomId,
      userId: userProfile.id,
      nickname: 'Hero',
      avatar: 1,
      color: '#AA5500',
      level: 2,
      power: 3,
      race: ['Human'],
      gender: ['male'],
      class: ['Warrior'],
    };
    const otherCharacter = {
      id: 'char-other',
      roomId,
      userId: 'user-2',
      nickname: 'Rogue',
      avatar: 2,
      color: '#0088CC',
      level: 4,
      power: 1,
      race: ['Elf'],
      gender: ['female'],
      class: ['Thief'],
    };
    const firstUpdatedCharacter: Character = {
      ...otherCharacter,
      power: 2,
    };
    const secondUpdatedCharacter: Character = {
      ...otherCharacter,
      power: 3,
    };
    const resolvers: Array<(value: Character) => void> = [];

    let listener: ((event: { event: string; event_body: { characterId: string } }) => void) | undefined;
    mockSubscribe.mockImplementation((callback: (event: { event: string; event_body: { characterId: string } }) => void) => {
      listener = callback;
      return () => undefined;
    });
    mockGetCharactersByRoom.mockResolvedValue([selfCharacter, otherCharacter]);
    mockUpdateCharacter.mockImplementation(
      () =>
        new Promise<Character>((resolve) => {
          resolvers.push(resolve);
        })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRoomCharacters(roomId, userProfile), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.characters).toHaveLength(2);
    });

    let firstPendingUpdate: Promise<Character>;
    let secondPendingUpdate: Promise<Character>;
    await act(async () => {
      firstPendingUpdate = result.current.update('char-other', { power: 2 });
      secondPendingUpdate = result.current.update('char-other', { power: 3 });
      await Promise.resolve();
    });

    act(() => {
      listener?.({ event: 'character_updated', event_body: { characterId: 'char-other' } });
    });

    expect(result.current.realtimeUpdateSignals['char-other']).toBeUndefined();

    await act(async () => {
      resolvers[0]?.(firstUpdatedCharacter);
      await firstPendingUpdate!;
    });

    act(() => {
      listener?.({ event: 'character_updated', event_body: { characterId: 'char-other' } });
    });

    expect(result.current.realtimeUpdateSignals['char-other']).toBeUndefined();

    await act(async () => {
      resolvers[1]?.(secondUpdatedCharacter);
      await secondPendingUpdate!;
    });

    act(() => {
      listener?.({ event: 'character_updated', event_body: { characterId: 'char-other' } });
    });

    await waitFor(() => {
      expect(result.current.realtimeUpdateSignals['char-other']).toBe(1);
    });
  });
});
