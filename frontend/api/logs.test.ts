import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '@/api/http';
import { getRoomLogs, type LogEvent } from '@/api/logs';

vi.mock('@/api/http', () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const logEntries: LogEvent[] = [
  {
    id: 'log-2',
    roomId: 'room/1',
    eventType: 'character_updated',
    actorId: 'user-1',
    summary: 'Changed Mage',
    payload: { character: { name: 'Mage' }, changes: { level: { prev: 1, next: 2 } } },
    occurredAt: '2026-05-21T10:00:00.000Z',
    createdAt: '2026-05-21T10:00:01.000Z',
    updatedAt: '2026-05-21T10:00:01.000Z',
  },
  {
    id: 'log-1',
    roomId: 'room/1',
    eventType: 'character_created',
    actorId: null,
    summary: 'Created Mage',
    payload: { character: { name: 'Mage' } },
    occurredAt: '2026-05-21T09:00:00.000Z',
  },
];

describe('logs api', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it('gets the first room logs page as a bare array without a cursor', async () => {
    const signal = new AbortController().signal;
    mockApiRequest.mockResolvedValueOnce(logEntries);

    const response = await getRoomLogs('room/1', null, signal);

    expect(mockApiRequest).toHaveBeenCalledWith('/logs?roomId=room%2F1', {
      signal,
    });
    expect(response).toBe(logEntries);
  });

  it('gets a cursor page with an encoded before value', async () => {
    const signal = new AbortController().signal;
    mockApiRequest.mockResolvedValueOnce([]);

    const response = await getRoomLogs('room 1', 'cursor/1', signal);

    expect(mockApiRequest).toHaveBeenCalledWith('/logs?roomId=room%201&before=cursor%2F1', {
      signal,
    });
    expect(response).toEqual([]);
  });

  it('omits the cursor for undefined or blank before values', async () => {
    mockApiRequest.mockResolvedValue([]);

    await getRoomLogs('room-1', undefined);
    await getRoomLogs('room-1', '');

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/logs?roomId=room-1', {
      signal: undefined,
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/logs?roomId=room-1', {
      signal: undefined,
    });
  });

  it('propagates transport failures', async () => {
    mockApiRequest.mockRejectedValueOnce(new Error('Load failed'));

    await expect(getRoomLogs('room-1', null)).rejects.toThrow('Load failed');
  });
});
