import { describe, expect, it, vi } from 'vitest';

import { apiRequest } from '@/api/http';
import { createUser, getUser, updateUser } from '@/api/users';

vi.mock('@/api/http', () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe('users api', () => {
  it('creates a user', async () => {
    mockApiRequest.mockResolvedValueOnce({ id: 'user-1', name: 'Alice', avatarId: 2 });

    const response = await createUser({ name: 'Alice', avatarId: 2 });

    expect(mockApiRequest).toHaveBeenCalledWith('/users', {
      method: 'POST',
      body: { name: 'Alice', avatarId: 2 },
      signal: undefined,
    });
    expect(response).toEqual({ id: 'user-1', name: 'Alice', avatarId: 2 });
  });

  it('gets a user by encoded id', async () => {
    mockApiRequest.mockResolvedValueOnce({ id: 'user/2', name: 'Bob', avatarId: 4 });

    const response = await getUser('user/2');

    expect(mockApiRequest).toHaveBeenCalledWith('/users/user%2F2', {
      method: 'GET',
      signal: undefined,
    });
    expect(response.name).toBe('Bob');
  });

  it('updates a user', async () => {
    mockApiRequest.mockResolvedValueOnce({ id: 'user-3', name: 'Cara', avatarId: 7 });

    const response = await updateUser('user-3', { avatarId: 7 });

    expect(mockApiRequest).toHaveBeenCalledWith('/users/user-3', {
      method: 'PATCH',
      body: { avatarId: 7 },
      signal: undefined,
    });
    expect(response.avatarId).toBe(7);
  });
});