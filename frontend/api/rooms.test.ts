import { describe, expect, it, vi } from 'vitest';

import { apiRequest } from '@/api/http';
import { createRoom, joinRoom } from '@/api/rooms';

vi.mock('@/api/http', () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe('rooms api', () => {
  it('creates a room', async () => {
    mockApiRequest.mockResolvedValueOnce({
      roomId: 'ROOM01',
      roomTypeId: 'munchkin',
      userId: 'user-1',
      characterId: 'char-1',
      createdAt: '2026-03-13T00:00:00.000Z',
    });

    const response = await createRoom({
      roomTypeId: 'munchkin',
      userId: 'user-1',
      userName: 'Alice',
      avatarId: 2,
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/rooms', {
      method: 'POST',
      body: {
        roomTypeId: 'munchkin',
        userId: 'user-1',
        userName: 'Alice',
        avatarId: 2,
      },
      signal: undefined,
    });
    expect(response.roomId).toBe('ROOM01');
  });

  it('joins a room', async () => {
    mockApiRequest.mockResolvedValueOnce({
      roomId: 'ROOM01',
      userId: 'user-2',
      characterId: 'char-2',
      joinedAt: '2026-03-13T00:00:00.000Z',
      alreadyJoined: false,
    });

    const response = await joinRoom({
      roomId: 'ROOM01',
      userId: 'user-2',
      userName: 'Bob',
      avatarId: 6,
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/rooms/associations', {
      method: 'POST',
      body: {
        roomId: 'ROOM01',
        userId: 'user-2',
        userName: 'Bob',
        avatarId: 6,
      },
      signal: undefined,
    });
    expect(response.alreadyJoined).toBe(false);
  });
});