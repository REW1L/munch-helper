import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '@/api/http';
import { createUser, getUser, updateUser } from '@/api/users';
import { useUserProfile } from '@/hooks/useUser';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock('@/api/users', () => ({
  createUser: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/constants/avatars', () => ({
  default: [1, 2, 3],
}));

const mockAsyncStorage = vi.mocked(AsyncStorage);
const mockCreateUser = vi.mocked(createUser);
const mockGetUser = vi.mocked(getUser);
const mockUpdateUser = vi.mocked(updateUser);

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads a stored profile and syncs it from the API', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      id: 'user-1',
      nickname: 'Stored Alice',
      avatar: 1,
    }));
    mockGetUser.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Remote Alice',
      avatarId: 2,
      createdAt: '2026-03-13T00:00:00.000Z',
      updatedAt: '2026-03-13T00:00:00.000Z',
    });

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.userProfile).toEqual({
        id: 'user-1',
        nickname: 'Remote Alice',
        avatar: 2,
      });
    });

    expect(mockGetUser).toHaveBeenCalledWith('user-1');
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'user',
      JSON.stringify({ id: 'user-1', nickname: 'Remote Alice', avatar: 2 })
    );
  });

  it('recreates a stored profile when the remote user is missing', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      id: 'user-404',
      nickname: 'Stored Bob',
      avatar: 0,
    }));
    mockGetUser.mockRejectedValueOnce(new ApiError('missing', 404));
    mockCreateUser.mockResolvedValueOnce({
      id: 'user-new',
      name: 'Stored Bob',
      avatarId: 0,
      createdAt: '2026-03-13T00:00:00.000Z',
      updatedAt: '2026-03-13T00:00:00.000Z',
    });

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.userProfile).toEqual({
        id: 'user-new',
        nickname: 'Stored Bob',
        avatar: 0,
      });
    });

    expect(mockCreateUser).toHaveBeenCalledWith({
      name: 'Stored Bob',
      avatarId: 0,
    });
  });

  it('falls back to the stored profile when remote sync fails with a non-404 error', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      id: 'user-2',
      nickname: 'Stored Cara',
      avatar: 1,
    }));
    mockGetUser.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.userProfile).toEqual({
        id: 'user-2',
        nickname: 'Stored Cara',
        avatar: 1,
      });
    });

    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('creates a default remote profile when nothing is stored', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    mockCreateUser.mockResolvedValueOnce({
      id: 'user-3',
      name: 'Player AAAAAA',
      avatarId: 0,
      createdAt: '2026-03-13T00:00:00.000Z',
      updatedAt: '2026-03-13T00:00:00.000Z',
    });

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.userProfile).toEqual({
        id: 'user-3',
        nickname: 'Player AAAAAA',
        avatar: 0,
      });
    });

    expect(mockCreateUser).toHaveBeenCalledWith({
      name: 'Player AAAAAA',
      avatarId: 0,
    });
  });

  it('falls back to a generated local profile when storage access fails', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('storage failed'));

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.userProfile).toEqual({
        id: '',
        nickname: 'Player AAAAAA',
        avatar: 0,
      });
    });

    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('persists and updates an explicit profile change', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      id: 'user-1',
      nickname: 'Stored Alice',
      avatar: 1,
    }));
    mockGetUser.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Remote Alice',
      avatarId: 2,
      createdAt: '2026-03-13T00:00:00.000Z',
      updatedAt: '2026-03-13T00:00:00.000Z',
    });

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.userProfile.id).toBe('user-1');
    });

    await act(async () => {
      await result.current.setUserProfile({
        id: 'user-1',
        nickname: 'Updated Alice',
        avatar: 0,
      });
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'user',
      JSON.stringify({ id: 'user-1', nickname: 'Updated Alice', avatar: 0 })
    );
    expect(mockUpdateUser).toHaveBeenCalledWith('user-1', {
      name: 'Updated Alice',
      avatarId: 0,
    });
  });
});