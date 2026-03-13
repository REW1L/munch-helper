import { DeleteConnectionCommand, GetConnectionCommand, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRoomConnection } = vi.hoisted(() => ({
  mockRoomConnection: {
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('./models/RoomConnection', () => ({
  RoomConnection: mockRoomConnection,
}));

import {
  disconnectConnection,
  listRoomConnections,
  removeConnection,
  sendEventToConnections,
  upsertConnection,
} from './service';

describe('room notification service', () => {
  beforeEach(() => {
    mockRoomConnection.findOneAndUpdate.mockReset();
    mockRoomConnection.deleteOne.mockReset();
    mockRoomConnection.find.mockReset();
  });

  it('upserts a connection record', async () => {
    await upsertConnection({
      connectionId: 'conn-1',
      roomId: 'ROOM01',
      userId: 'user-1',
    });

    expect(mockRoomConnection.findOneAndUpdate).toHaveBeenCalledWith(
      { connectionId: 'conn-1' },
      expect.objectContaining({
        connectionId: 'conn-1',
        roomId: 'ROOM01',
        userId: 'user-1',
        connectedAt: expect.any(Date),
      }),
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  });

  it('removes a connection record', async () => {
    await removeConnection('conn-2');

    expect(mockRoomConnection.deleteOne).toHaveBeenCalledWith({ connectionId: 'conn-2' });
  });

  it('lists room connections in mapped form', async () => {
    const connectedAt = new Date('2026-03-13T00:00:00.000Z');
    const updatedAt = new Date('2026-03-13T01:00:00.000Z');
    mockRoomConnection.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          connectionId: 'conn-3',
          roomId: 'ROOM01',
          userId: 'user-3',
          connectedAt,
          updatedAt,
        },
      ]),
    });

    const response = await listRoomConnections('ROOM01');

    expect(mockRoomConnection.find).toHaveBeenCalledWith({ roomId: 'ROOM01' });
    expect(response).toEqual([
      {
        connectionId: 'conn-3',
        roomId: 'ROOM01',
        userId: 'user-3',
        connectedAt,
        updatedAt,
      },
    ]);
  });

  it('delivers events to active websocket connections', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const client = { send };

    await sendEventToConnections(
      client as never,
      [
        {
          connectionId: 'conn-1',
          roomId: 'ROOM01',
          userId: 'user-1',
          connectedAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        event: 'character_created',
        roomId: 'ROOM01',
        event_body: { characterId: 'char-1' },
        emittedAt: '2026-03-13T00:00:00.000Z',
      }
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetConnectionCommand);
    expect(send.mock.calls[0]?.[0].input).toEqual({ ConnectionId: 'conn-1' });
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(PostToConnectionCommand);
    expect(send.mock.calls[1]?.[0].input).toEqual({
      ConnectionId: 'conn-1',
      Data: Buffer.from(JSON.stringify({
        event: 'character_created',
        event_body: { characterId: 'char-1' },
      })),
    });
  });

  it('removes stale connections when api gateway reports 410', async () => {
    const send = vi.fn().mockRejectedValue({ $metadata: { httpStatusCode: 410 } });
    const client = { send };

    await sendEventToConnections(
      client as never,
      [
        {
          connectionId: 'conn-stale',
          roomId: 'ROOM01',
          userId: 'user-1',
          connectedAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {
        event: 'character_deleted',
        roomId: 'ROOM01',
        event_body: { characterId: 'char-1' },
        emittedAt: '2026-03-13T00:00:00.000Z',
      }
    );

    expect(mockRoomConnection.deleteOne).toHaveBeenCalledWith({ connectionId: 'conn-stale' });
  });

  it('propagates non-stale websocket delivery failures', async () => {
    const send = vi.fn().mockRejectedValue(new Error('delivery failed'));

    await expect(
      sendEventToConnections(
        { send } as never,
        [
          {
            connectionId: 'conn-err',
            roomId: 'ROOM01',
            userId: 'user-1',
            connectedAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {
          event: 'character_updated',
          roomId: 'ROOM01',
          event_body: { characterId: 'char-1' },
          emittedAt: '2026-03-13T00:00:00.000Z',
        }
      )
    ).rejects.toThrow('delivery failed');
  });

  it('swallows disconnect failures', async () => {
    const send = vi.fn().mockRejectedValue(new Error('gone'));

    await expect(disconnectConnection({ send } as never, 'conn-4')).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(DeleteConnectionCommand);
    expect(send.mock.calls[0]?.[0].input).toEqual({ ConnectionId: 'conn-4' });
  });
});