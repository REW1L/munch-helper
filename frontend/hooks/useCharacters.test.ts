import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type Character,
  createCharacter,
  getCharactersByRoom,
  updateCharacter,
} from '@/api/characters';
import { useRoomCharacters } from '@/hooks/useCharacters';
import type { UserProfileInterface } from '@/hooks/useUser';

const mockSubscribe = vi.fn<(listener: (event: { event: string; event_body: { characterId: string } }) => void) => () => void>(
  () => () => undefined
);

vi.mock('@/api/characters', () => ({
  createCharacter: vi.fn(),
  getCharactersByRoom: vi.fn(),
  updateCharacter: vi.fn(),
}));

vi.mock('@/hooks/useRoomWebSocket', () => ({
  useRoomWebSocket: () => ({
    isConnected: true,
    subscribe: mockSubscribe,
  }),
}));

const mockGetCharactersByRoom = vi.mocked(getCharactersByRoom);
const mockCreateCharacter = vi.mocked(createCharacter);
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
    mockUpdateCharacter.mockReset();
    mockSubscribe.mockReset();
    mockSubscribe.mockImplementation(() => () => undefined);
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
