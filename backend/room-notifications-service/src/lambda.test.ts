import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConnectToMongo, mockListRoomConnections, mockRemoveConnection, mockSendEventToConnections, mockUpsertConnection } = vi.hoisted(() => ({
  mockConnectToMongo: vi.fn(),
  mockListRoomConnections: vi.fn(),
  mockRemoveConnection: vi.fn(),
  mockSendEventToConnections: vi.fn(),
  mockUpsertConnection: vi.fn(),
}));

vi.mock('./db', () => ({
  connectToMongo: mockConnectToMongo,
}));

vi.mock('./service', () => ({
  listRoomConnections: mockListRoomConnections,
  removeConnection: mockRemoveConnection,
  sendEventToConnections: mockSendEventToConnections,
  upsertConnection: mockUpsertConnection,
}));

vi.mock('./app', () => ({
  parseConnectRequest: vi.fn((event) => event.connectRequest ?? null),
  parseNotificationEvent: vi.fn((message) => {
    if (typeof message !== 'string') {
      return null;
    }

    try {
      return JSON.parse(message);
    } catch {
      return null;
    }
  }),
}));

describe('room-notifications lambda', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnectToMongo.mockReset();
    mockListRoomConnections.mockReset();
    mockRemoveConnection.mockReset();
    mockSendEventToConnections.mockReset();
    mockUpsertConnection.mockReset();
    delete process.env.ROOM_NOTIFICATIONS_MONGO_URI;
    delete process.env.ROOM_NOTIFICATIONS_WS_ENDPOINT;
  });

  it('handles websocket connect events', async () => {
    const { handler } = await import('./lambda');

    const response = await handler({
      requestContext: { routeKey: '$connect', connectionId: 'conn-1' },
      connectRequest: { connectionId: 'conn-1', roomId: 'ROOM01', userId: 'user-1' },
    });

    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://localhost:27017/munch_room_notifications_service');
    expect(mockUpsertConnection).toHaveBeenCalledWith({ connectionId: 'conn-1', roomId: 'ROOM01', userId: 'user-1' });
    expect(response).toEqual({ statusCode: 200, body: 'Connected.' });
  });

  it('handles sns events when a websocket endpoint is configured', async () => {
    process.env.ROOM_NOTIFICATIONS_WS_ENDPOINT = 'https://example.execute-api.eu-central-1.amazonaws.com/dev';
    mockListRoomConnections.mockResolvedValueOnce([
      {
        connectionId: 'conn-2',
        roomId: 'ROOM01',
        userId: 'user-2',
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const { handler } = await import('./lambda');
    const response = await handler({
      Records: [
        {
          Sns: {
            Message: JSON.stringify({
              event: 'character_created',
              roomId: 'ROOM01',
              event_body: { characterId: 'char-1' },
              emittedAt: '2026-03-13T00:00:00.000Z',
            }),
          },
        },
      ],
    });

    expect(mockListRoomConnections).toHaveBeenCalledWith('ROOM01');
    expect(mockSendEventToConnections).toHaveBeenCalledTimes(1);
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify({ processed: 1 }) });
  });
});