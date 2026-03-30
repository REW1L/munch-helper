import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCharacter,
  getCharactersByRoom,
  updateCharacter,
} from '@/api/characters';
import { useRoomCharacters } from '@/hooks/useCharacters';
import type { UserProfileInterface } from '@/hooks/useUser';

const mockSubscribe = vi.fn(() => () => undefined);

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

  it('raises realtime update signals for other players on websocket character updates', async () => {
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
    mockSubscribe.mockImplementation((callback) => {
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
      expect(result.current.realtimeUpdateSignals['char-self']).toBeUndefined();
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
});
