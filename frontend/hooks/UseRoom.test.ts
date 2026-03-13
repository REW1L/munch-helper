import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRoom, joinRoom } from '@/api/rooms';
import { useRoomCreate, useRoomJoin } from '@/hooks/UseRoom';

vi.mock('@/api/rooms', () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
}));

const mockCreateRoom = vi.mocked(createRoom);
const mockJoinRoom = vi.mocked(joinRoom);

describe('UseRoom hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockCreateRoom.mockReset();
    mockJoinRoom.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('creates a room and exposes the mutation result', async () => {
    mockCreateRoom.mockResolvedValueOnce({
      roomId: 'ROOM01',
      roomTypeId: 'munchkin',
      userId: 'user-1',
      characterId: 'char-1',
      createdAt: '2026-03-13T00:00:00.000Z',
    });

    const { result } = renderHook(() => useRoomCreate(), { wrapper });

    await act(async () => {
      await result.current.create({ userId: 'user-1', nickname: 'Alice', avatar: 2 });
    });

    await waitFor(() => {
      expect(result.current.result?.roomId).toBe('ROOM01');
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockCreateRoom).toHaveBeenCalledWith({
      roomTypeId: 'munchkin',
      userId: 'user-1',
      userName: 'Alice',
      avatarId: 2,
    });
  });

  it('joins a room and exposes errors from the mutation', async () => {
    mockJoinRoom.mockRejectedValueOnce(new Error('join failed'));

    const { result } = renderHook(() => useRoomJoin(), { wrapper });

    await expect(
      act(async () => result.current.join('ROOM02', { userId: 'user-2', nickname: 'Bob', avatar: 4 }))
    ).rejects.toThrow('join failed');

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('join failed');
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockJoinRoom).toHaveBeenCalledWith({
      roomId: 'ROOM02',
      userId: 'user-2',
      userName: 'Bob',
      avatarId: 4,
    });
  });
});