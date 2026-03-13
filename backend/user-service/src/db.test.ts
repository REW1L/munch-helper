import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMongoose = {
  connection: {
    readyState: 0,
  },
  connect: vi.fn(),
};

vi.mock('mongoose', () => ({
  default: mockMongoose,
}));

describe('user-service db', () => {
  beforeEach(() => {
    mockMongoose.connection.readyState = 0;
    mockMongoose.connect.mockReset();
    vi.resetModules();
  });

  it('skips connecting when mongoose is already connected', async () => {
    mockMongoose.connection.readyState = 1;
    const { connectToMongo } = await import('./db.js');

    await connectToMongo('mongodb://example/user');

    expect(mockMongoose.connect).not.toHaveBeenCalled();
  });

  it('reuses the same in-flight connection promise', async () => {
    let resolveConnection: (() => void) | undefined;
    mockMongoose.connect.mockImplementationOnce(() => new Promise((resolve) => {
      resolveConnection = () => resolve(mockMongoose as never);
    }));

    const { connectToMongo } = await import('./db.js');

    const first = connectToMongo('mongodb://example/user');
    const second = connectToMongo('mongodb://example/user');
    resolveConnection?.();

    await Promise.all([first, second]);

    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
    expect(mockMongoose.connect).toHaveBeenCalledWith('mongodb://example/user');
  });

  it('resets the cached promise after a failed connection attempt', async () => {
    mockMongoose.connect
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce(mockMongoose as never);

    const { connectToMongo } = await import('./db.js');

    await expect(connectToMongo('mongodb://example/user')).rejects.toThrow('first failure');
    await expect(connectToMongo('mongodb://example/user')).resolves.toBeUndefined();

    expect(mockMongoose.connect).toHaveBeenCalledTimes(2);
  });
});