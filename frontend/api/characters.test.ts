import { describe, expect, it, vi } from 'vitest';

import { createCharacter, getCharactersByRoom, updateCharacter } from '@/api/characters';
import { apiRequest } from '@/api/http';

vi.mock('@/api/http', () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe('characters api', () => {
  it('gets characters by room and normalizes array-like fields', async () => {
    mockApiRequest.mockResolvedValueOnce({
      items: [
        {
          id: 'char-1',
          roomId: 'room/1',
          userId: 'user-1',
          name: 'Mage',
          avatarId: 3,
          color: 'invalid',
          level: 4,
          power: 8,
          class: '["Wizard"," Cleric "]',
          race: 'Elf, Human',
          gender: ['female', ''],
        },
      ],
    });

    const response = await getCharactersByRoom('room/1');

    expect(mockApiRequest).toHaveBeenCalledWith('/characters?roomId=room%2F1', {
      signal: undefined,
    });
    expect(response).toEqual([
      {
        id: 'char-1',
        roomId: 'room/1',
        userId: 'user-1',
        nickname: 'Mage',
        avatar: 3,
        color: expect.stringMatching(/^#[0-9A-F]{6}$/),
        level: 4,
        power: 8,
        class: ['Wizard', ' Cleric '],
        race: ['Elf', 'Human'],
        gender: ['female'],
      },
    ]);
  });

  it('creates characters with serialized array fields and defaults', async () => {
    mockApiRequest.mockResolvedValueOnce({
      id: 'char-2',
      roomId: 'room-2',
      userId: null,
      name: 'Rogue',
      avatarId: 5,
      color: '#123456',
      level: 1,
      power: 0,
      class: '[]',
      race: '["Halfling"]',
      gender: 'Nonbinary',
    });

    const response = await createCharacter({
      roomId: 'room-2',
      nickname: 'Rogue',
      avatar: 5,
      color: '#123456',
      race: ['Halfling'],
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/characters', {
      method: 'POST',
      body: {
        roomId: 'room-2',
        userId: null,
        name: 'Rogue',
        avatarId: 5,
        color: '#123456',
        level: 1,
        power: 0,
        class: '[]',
        race: '["Halfling"]',
        gender: '[]',
      },
    });
    expect(response).toEqual({
      id: 'char-2',
      roomId: 'room-2',
      userId: null,
      nickname: 'Rogue',
      avatar: 5,
      color: '#123456',
      level: 1,
      power: 0,
      class: [],
      race: ['Halfling'],
      gender: ['Nonbinary'],
    });
  });

  it('updates only provided character fields', async () => {
    mockApiRequest.mockResolvedValueOnce({
      id: 'char-3',
      roomId: 'room-3',
      userId: 'user-3',
      name: 'Warrior+',
      avatarId: 9,
      color: '#AABBCC',
      level: 5,
      power: 10,
      class: '["Warrior"]',
      race: '["Human"]',
      gender: '["male"]',
    });

    const response = await updateCharacter('char/3', {
      nickname: 'Warrior+',
      avatar: 9,
      class: ['Warrior'],
      userId: null,
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/characters/char%2F3', {
      method: 'PATCH',
      body: {
        userId: null,
        name: 'Warrior+',
        avatarId: 9,
        class: '["Warrior"]',
      },
    });
    expect(response.nickname).toBe('Warrior+');
    expect(response.class).toEqual(['Warrior']);
  });
});