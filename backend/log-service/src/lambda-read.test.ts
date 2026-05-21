import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConnectToMongo, mockBuildLogApp, mockServerFactory, mockServerHandler } = vi.hoisted(() => ({
  mockConnectToMongo: vi.fn(),
  mockBuildLogApp: vi.fn(() => 'log-app'),
  mockServerHandler: vi.fn(),
  mockServerFactory: vi.fn(),
}));

vi.mock('./db', () => ({
  connectToMongo: mockConnectToMongo,
}));

vi.mock('./app', () => ({
  buildLogApp: mockBuildLogApp,
}));

vi.mock('@codegenie/serverless-express', () => ({
  default: mockServerFactory,
}));

describe('log-service read lambda', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnectToMongo.mockReset();
    mockBuildLogApp.mockReset();
    mockBuildLogApp.mockReturnValue('log-app');
    mockServerHandler.mockReset();
    mockServerFactory.mockReset();
    mockServerFactory.mockReturnValue(mockServerHandler);
    delete process.env.ROUTE_PREFIX;
    delete process.env.LOG_MONGO_URI;
  });

  it('connects to log Mongo before handling HTTP events', async () => {
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200, body: 'ok' });
    const { handler } = await import('./lambda-read.js');

    await expect(handler({ rawPath: '/logs' }, {})).resolves.toEqual({ statusCode: 200, body: 'ok' });
    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://localhost:27025/munch_log_service');
    expect(mockServerHandler).toHaveBeenCalledWith({ rawPath: '/logs' }, {});
  });

  it('boots with route prefix and configured mongo URI', async () => {
    process.env.ROUTE_PREFIX = '/prod';
    process.env.LOG_MONGO_URI = 'mongodb://mongo/logs';
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200 });

    const { handler } = await import('./lambda-read.js');
    await handler({ path: '/logs' }, {});

    expect(mockBuildLogApp).toHaveBeenCalledWith({ routePrefix: '/prod' });
    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://mongo/logs');
  });
});
