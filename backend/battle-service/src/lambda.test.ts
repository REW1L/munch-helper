import { beforeEach, describe, expect, it, vi } from 'vitest';

const connectToMongo = vi.fn().mockResolvedValue(undefined);
const server = vi.fn().mockResolvedValue({ statusCode: 200, body: 'ok' });

vi.mock('@codegenie/serverless-express', () => ({
  default: vi.fn(() => server)
}));

vi.mock('./db', () => ({
  connectToMongo
}));

vi.mock('./service', () => ({
  buildBattleApp: vi.fn(() => ({ app: true }))
}));

describe('battle-service lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects to battle Mongo before handling events', async () => {
    const { handler } = await import('./lambda.js');

    await expect(handler({ rawPath: '/battles' }, {})).resolves.toEqual({ statusCode: 200, body: 'ok' });
    expect(connectToMongo).toHaveBeenCalled();
    expect(server).toHaveBeenCalledWith({ rawPath: '/battles' }, {});
  });
});
