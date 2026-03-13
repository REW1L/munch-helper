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

describe('character-service db', () => {
  beforeEach(() => {
    mockMongoose.connection.readyState = 0;
    mockMongoose.connect.mockReset();
    vi.resetModules();
  });

  it('skips connecting when mongoose is already connected', async () => {
    mockMongoose.connection.readyState = 1;
    const { connectToMongo } = await import('./db');

    await connectToMongo('mongodb://example/character');

    expect(mockMongoose.connect).not.toHaveBeenCalled();
  });

  it('reuses the same in-flight connection promise', async () => {
    let resolveConnection: (() => void) | undefined;
    mockMongoose.connect.mockImplementationOnce(() => new Promise((resolve) => {
      resolveConnection = () => resolve(mockMongoose as never);
    }));

    const { connectToMongo } = await import('./db');

    const first = connectToMongo('mongodb://example/character');
    const second = connectToMongo('mongodb://example/character');
    resolveConnection?.();

    await Promise.all([first, second]);

    expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
    expect(mockMongoose.connect).toHaveBeenCalledWith('mongodb://example/character');
  });

  it('resets the cached promise after a failed connection attempt', async () => {
    mockMongoose.connect
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce(mockMongoose as never);

    const { connectToMongo } = await import('./db');

    await expect(connectToMongo('mongodb://example/character')).rejects.toThrow('first failure');
    await expect(connectToMongo('mongodb://example/character')).resolves.toBeUndefined();

    expect(mockMongoose.connect).toHaveBeenCalledTimes(2);
  });
});