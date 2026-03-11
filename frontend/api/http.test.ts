import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '@/api/http';

describe('apiRequest', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses JSON response for successful requests', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ id: 'user-1' }),
    });

    const response = await apiRequest<{ id: string }>('/users/user-1');
    expect(response).toEqual({ id: 'user-1' });
  });

  it('retries on retriable HTTP status codes', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({ message: 'service unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({ success: true }),
      });

    const response = await apiRequest<{ success: boolean }>('/health', { retryCount: 1, retryDelayMs: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response).toEqual({ success: true });
  });

  it('throws ApiError immediately for non-retriable status', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ message: 'bad request' }),
    });

    await expect(apiRequest('/rooms', { method: 'POST', body: { room: 'x' }, retryCount: 2, retryDelayMs: 0 })).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: 'bad request',
        status: 400,
      })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
