import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConnectToMongo, mockBuildUserApp, mockServerFactory, mockServerHandler } = vi.hoisted(() => ({
  mockConnectToMongo: vi.fn(),
  mockBuildUserApp: vi.fn(() => 'user-app'),
  mockServerHandler: vi.fn(),
  mockServerFactory: vi.fn(),
}));

vi.mock('./db', () => ({
  connectToMongo: mockConnectToMongo,
}));

vi.mock('./service', () => ({
  buildUserApp: mockBuildUserApp,
}));

vi.mock('@codegenie/serverless-express', () => ({
  default: mockServerFactory,
}));

describe('user-service lambda', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnectToMongo.mockReset();
    mockBuildUserApp.mockReset();
    mockBuildUserApp.mockReturnValue('user-app');
    mockServerHandler.mockReset();
    mockServerFactory.mockReset();
    mockServerFactory.mockReturnValue(mockServerHandler);
    delete process.env.ROUTE_PREFIX;
    delete process.env.USER_MONGO_URI;
  });

  it('boots the lambda with env config and delegates requests', async () => {
    process.env.ROUTE_PREFIX = '/prod';
    process.env.USER_MONGO_URI = 'mongodb://mongo/user';
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200 });

    const { handler } = await import('./lambda');
    const response = await handler({ path: '/users' }, { requestId: 'ctx' });

    expect(mockBuildUserApp).toHaveBeenCalledWith({ routePrefix: '/prod' });
    expect(mockServerFactory).toHaveBeenCalledWith({ app: 'user-app' });
    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://mongo/user');
    expect(mockServerHandler).toHaveBeenCalledWith({ path: '/users' }, { requestId: 'ctx' });
    expect(response).toEqual({ statusCode: 200 });
  });
});