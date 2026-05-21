import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mongoose } from '../db';
import { buildLogApp } from '../app';

const { mockLogEventFind, mockLogEventFindOne } = vi.hoisted(() => ({
  mockLogEventFind: vi.fn(),
  mockLogEventFindOne: vi.fn(),
}));

vi.mock('../models/LogEvent', () => ({
  LogEvent: {
    create: vi.fn(),
    find: mockLogEventFind,
    findOne: mockLogEventFindOne,
  },
}));

interface QueryMock {
  sort: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
}

const buildLogEvent = (overrides: Record<string, unknown> = {}) => ({
  toJSON: () => ({
    id: '64f000000000000000000001',
    roomId: 'room-1',
    eventType: 'character_created',
    actorId: 'char-1',
    summary: 'Ada created',
    payload: { character: { id: 'char-1', name: 'Ada' } },
    occurredAt: new Date('2026-05-20T10:00:00.000Z'),
    createdAt: new Date('2026-05-20T10:00:01.000Z'),
    updatedAt: new Date('2026-05-20T10:00:01.000Z'),
    ...overrides,
  }),
});

const mockFindResult = (documents: unknown[]): QueryMock => {
  const query = {
    sort: vi.fn(),
    limit: vi.fn(),
    exec: vi.fn().mockResolvedValue(documents),
  };
  query.sort.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  mockLogEventFind.mockReturnValue(query);
  return query;
};

const mockFindOneResult = (document: unknown | null): { exec: ReturnType<typeof vi.fn> } => {
  const query = {
    exec: vi.fn().mockResolvedValue(document),
  };
  mockLogEventFindOne.mockReturnValue(query);
  return query;
};

describe('log-service logs routes', () => {
  beforeEach(() => {
    mockLogEventFind.mockReset();
    mockLogEventFindOne.mockReset();
  });

  it('returns paginated room history for a present roomId', async () => {
    const query = mockFindResult([buildLogEvent()]);

    const response = await request(buildLogApp()).get('/logs').query({ roomId: 'room-1' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toEqual(expect.objectContaining({
      id: '64f000000000000000000001',
      roomId: 'room-1',
      eventType: 'character_created',
      actorId: 'char-1',
      summary: 'Ada created',
      payload: { character: { id: 'char-1', name: 'Ada' } },
      occurredAt: '2026-05-20T10:00:00.000Z',
      createdAt: '2026-05-20T10:00:01.000Z',
      updatedAt: '2026-05-20T10:00:01.000Z',
    }));
    expect(response.body[0]._id).toBeUndefined();
    expect(mockLogEventFind).toHaveBeenCalledWith({ roomId: 'room-1' });
    expect(query.sort).toHaveBeenCalledWith({ _id: -1 });
    expect(query.limit).toHaveBeenCalledWith(50);
  });

  it('uses an exclusive ObjectId cursor for older pages', async () => {
    const before = '64f000000000000000000099';
    const query = mockFindResult([]);

    const response = await request(buildLogApp()).get('/logs').query({ roomId: 'room-1', before });

    expect(response.status).toBe(200);
    const filter = mockLogEventFind.mock.calls[0][0];
    expect(filter.roomId).toBe('room-1');
    expect(filter._id.$lt).toEqual(new mongoose.Types.ObjectId(before));
    expect(filter._id.$lte).toBeUndefined();
    expect(query.sort).toHaveBeenCalledWith({ _id: -1 });
  });

  it('returns 400 when roomId is missing or blank', async () => {
    const missingResponse = await request(buildLogApp()).get('/logs');
    const blankResponse = await request(buildLogApp()).get('/logs').query({ roomId: ' ' });

    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body).toEqual({ message: 'roomId is required' });
    expect(blankResponse.status).toBe(400);
    expect(blankResponse.body).toEqual({ message: 'roomId is required' });
    expect(mockLogEventFind).not.toHaveBeenCalled();
  });

  it('validates before before querying', async () => {
    const response = await request(buildLogApp()).get('/logs').query({ roomId: 'room-1', before: 'not-an-oid' });
    const blankResponse = await request(buildLogApp()).get('/logs').query({ roomId: 'room-1', before: ' ' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBeTruthy();
    expect(blankResponse.status).toBe(400);
    expect(blankResponse.body.message).toBeTruthy();
    expect(mockLogEventFind).not.toHaveBeenCalled();
  });

  it('applies default, explicit, and clamped limits', async () => {
    const defaultQuery = mockFindResult([]);
    await request(buildLogApp()).get('/logs').query({ roomId: 'room-1' });
    expect(defaultQuery.limit).toHaveBeenCalledWith(50);

    const explicitQuery = mockFindResult([]);
    await request(buildLogApp()).get('/logs').query({ roomId: 'room-1', limit: '10' });
    expect(explicitQuery.limit).toHaveBeenCalledWith(10);

    const clampedQuery = mockFindResult([]);
    await request(buildLogApp()).get('/logs').query({ roomId: 'room-1', limit: '9999' });
    expect(clampedQuery.limit).toHaveBeenCalledWith(100);
  });

  it('rejects invalid limits before querying', async () => {
    const zeroResponse = await request(buildLogApp()).get('/logs').query({ roomId: 'room-1', limit: '0' });
    const garbageResponse = await request(buildLogApp()).get('/logs').query({ roomId: 'room-1', limit: 'abc' });

    expect(zeroResponse.status).toBe(400);
    expect(zeroResponse.body.message).toBeTruthy();
    expect(garbageResponse.status).toBe(400);
    expect(garbageResponse.body.message).toBeTruthy();
    expect(mockLogEventFind).not.toHaveBeenCalled();
  });

  it('returns an empty array for an empty room history', async () => {
    mockFindResult([]);

    const response = await request(buildLogApp()).get('/logs').query({ roomId: 'room-empty' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns 502 when the list query fails unexpectedly', async () => {
    const query = mockFindResult([]);
    query.exec.mockRejectedValue(new Error('mongo unavailable'));

    const response = await request(buildLogApp()).get('/logs').query({ roomId: 'room-1' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: 'Unexpected error' });
  });

  it('returns a single log entry by id and roomId', async () => {
    const logId = '64f000000000000000000001';
    mockFindOneResult(buildLogEvent({ id: logId }));

    const response = await request(buildLogApp()).get(`/logs/${logId}`).query({ roomId: 'room-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      id: logId,
      roomId: 'room-1',
    }));
    expect(response.body._id).toBeUndefined();
    expect(mockLogEventFindOne).toHaveBeenCalledWith({
      _id: new mongoose.Types.ObjectId(logId),
      roomId: 'room-1',
    });
  });

  it('returns 404 for missing or cross-room log detail lookups', async () => {
    const logId = '64f000000000000000000001';
    mockFindOneResult(null);

    const missingResponse = await request(buildLogApp()).get(`/logs/${logId}`).query({ roomId: 'room-1' });
    const crossRoomResponse = await request(buildLogApp()).get(`/logs/${logId}`).query({ roomId: 'room-2' });

    expect(missingResponse.status).toBe(404);
    expect(crossRoomResponse.status).toBe(404);
    expect(mockLogEventFindOne).toHaveBeenNthCalledWith(2, {
      _id: new mongoose.Types.ObjectId(logId),
      roomId: 'room-2',
    });
  });

  it('validates detail params before querying', async () => {
    const missingRoomResponse = await request(buildLogApp()).get('/logs/64f000000000000000000001');
    const badIdResponse = await request(buildLogApp()).get('/logs/not-an-oid').query({ roomId: 'room-1' });

    expect(missingRoomResponse.status).toBe(400);
    expect(badIdResponse.status).toBe(400);
    expect(mockLogEventFindOne).not.toHaveBeenCalled();
  });

  it('returns 502 when the detail query fails unexpectedly', async () => {
    const logId = '64f000000000000000000001';
    const query = mockFindOneResult(null);
    query.exec.mockRejectedValue(new Error('mongo unavailable'));

    const response = await request(buildLogApp()).get(`/logs/${logId}`).query({ roomId: 'room-1' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: 'Unexpected error' });
  });

  it('mounts under a route prefix', async () => {
    mockFindResult([]);

    const response = await request(buildLogApp({ routePrefix: '/prod' })).get('/prod/logs').query({ roomId: 'room-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
