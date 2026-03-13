import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConnectToMongo, mockBuildRoomApp, mockServerFactory, mockServerHandler } = vi.hoisted(() => ({
  mockConnectToMongo: vi.fn(),
  mockBuildRoomApp: vi.fn(() => 'room-app'),
  mockServerHandler: vi.fn(),
  mockServerFactory: vi.fn(),
}));

vi.mock('./db', () => ({
  connectToMongo: mockConnectToMongo,
}));

vi.mock('./service', () => ({
  buildRoomApp: mockBuildRoomApp,
}));

vi.mock('@codegenie/serverless-express', () => ({
  default: mockServerFactory,
}));

describe('room-service lambda', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnectToMongo.mockReset();
    mockBuildRoomApp.mockReset();
    mockBuildRoomApp.mockReturnValue('room-app');
    mockServerHandler.mockReset();
    mockServerFactory.mockReset();
    mockServerFactory.mockReturnValue(mockServerHandler);
    delete process.env.ROOM_MONGO_URI;
    delete process.env.CHARACTER_SERVICE_URL;
    delete process.env.CHARACTER_CALL_TIMEOUT_MS;
    delete process.env.ROUTE_PREFIX;
  });

  it('boots the lambda with room dependencies and delegates requests', async () => {
    process.env.ROOM_MONGO_URI = 'mongodb://mongo/room';
    process.env.CHARACTER_SERVICE_URL = 'http://character-service';
    process.env.CHARACTER_CALL_TIMEOUT_MS = '4500';
    process.env.ROUTE_PREFIX = '/prod';
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200 });

    const { handler } = await import('./lambda');
    const response = await handler({ path: '/rooms' }, { requestId: 'ctx' });

    expect(mockBuildRoomApp).toHaveBeenCalledWith({
      characterServiceUrl: 'http://character-service',
      characterCallTimeoutMs: 4500,
      routePrefix: '/prod',
    });
    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://mongo/room');
    expect(mockServerHandler).toHaveBeenCalledWith({ path: '/rooms' }, { requestId: 'ctx' });
    expect(response).toEqual({ statusCode: 200 });
  });
});