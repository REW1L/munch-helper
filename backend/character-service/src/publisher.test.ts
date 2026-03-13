import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRedisClient, mockCreateClient } = vi.hoisted(() => {
  const mockRedisClient = {
    isOpen: false,
    on: vi.fn(),
    connect: vi.fn(),
    publish: vi.fn(),
  };

  return {
    mockRedisClient,
    mockCreateClient: vi.fn(() => mockRedisClient),
  };
});

vi.mock('redis', () => ({
  createClient: mockCreateClient,
}));

import {
  createCharacterEventPayload,
  NoopCharacterEventPublisher,
  RedisCharacterEventPublisher,
  SnsCharacterEventPublisher,
} from './publisher';

describe('character publisher', () => {
  beforeEach(() => {
    mockRedisClient.isOpen = false;
    mockRedisClient.on.mockReset();
    mockRedisClient.connect.mockReset();
    mockRedisClient.publish.mockReset();
    mockCreateClient.mockClear();
  });

  it('creates a serialized character event payload', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-13T00:00:00.000Z'));

    const payload = createCharacterEventPayload({
      event: 'character_created',
      roomId: 'ROOM01',
      characterId: 'char-1',
      correlationId: 'corr-1',
    });

    expect(payload).toEqual({
      event: 'character_created',
      roomId: 'ROOM01',
      event_body: {
        characterId: 'char-1',
      },
      emittedAt: '2026-03-13T00:00:00.000Z',
      correlationId: 'corr-1',
    });

    vi.useRealTimers();
  });

  it('publishes events to SNS', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const publisher = new SnsCharacterEventPublisher({ send } as never, 'arn:aws:sns:topic');

    await publisher.publish({
      event: 'character_updated',
      roomId: 'ROOM01',
      event_body: { characterId: 'char-1' },
      emittedAt: '2026-03-13T00:00:00.000Z',
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].input).toEqual({
      TopicArn: 'arn:aws:sns:topic',
      Message: JSON.stringify({
        event: 'character_updated',
        roomId: 'ROOM01',
        event_body: { characterId: 'char-1' },
        emittedAt: '2026-03-13T00:00:00.000Z',
      }),
    });
  });

  it('publishes events to redis and connects only once', async () => {
    mockRedisClient.connect.mockImplementation(async () => {
      mockRedisClient.isOpen = true;
    });
    mockRedisClient.publish.mockResolvedValue(1);

    const publisher = new RedisCharacterEventPublisher('redis://localhost:6379', 'room-events');
    const payload = {
      event: 'character_deleted' as const,
      roomId: 'ROOM01',
      event_body: { characterId: 'char-1' },
      emittedAt: '2026-03-13T00:00:00.000Z',
    };

    await publisher.publish(payload);
    await publisher.publish(payload);

    expect(mockCreateClient).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
    expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.publish).toHaveBeenNthCalledWith(1, 'room-events', JSON.stringify(payload));
    expect(mockRedisClient.publish).toHaveBeenNthCalledWith(2, 'room-events', JSON.stringify(payload));
  });

  it('allows the noop publisher to accept payloads', async () => {
    const publisher = new NoopCharacterEventPublisher();

    await expect(
      publisher.publish({
        event: 'character_created',
        roomId: 'ROOM01',
        event_body: { characterId: 'char-1' },
        emittedAt: '2026-03-13T00:00:00.000Z',
      })
    ).resolves.toBeUndefined();
  });
});