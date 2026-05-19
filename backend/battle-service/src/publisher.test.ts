import { describe, expect, it, vi } from 'vitest';

const { mockRedisClient } = vi.hoisted(() => ({
  mockRedisClient: {
    isOpen: true,
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

vi.mock('@aws-sdk/client-sns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-sns')>();
  return {
    ...actual,
    PublishCommand: actual.PublishCommand,
  };
});

import {
  NoopBattleEventPublisher,
  RedisBattleEventPublisher,
  SnsBattleEventPublisher,
  createBattleEventPayload,
} from './publisher';

const buildPayload = (overrides: Partial<{ event: 'battle_started'; battleId: string; correlationId: string }> = {}) =>
  createBattleEventPayload({
    event: 'battle_started',
    roomId: 'room-1',
    battleId: 'battle-1',
    ...overrides,
  });

describe('battle event publisher', () => {
  describe('createBattleEventPayload', () => {
    it('produces the canonical event_body shape', () => {
      const payload = buildPayload();
      expect(payload).toMatchObject({
        event: 'battle_started',
        roomId: 'room-1',
        event_body: { battleId: 'battle-1' },
      });
      expect(typeof payload.emittedAt).toBe('string');
      expect(payload.correlationId).toBeUndefined();
    });

    it('includes correlationId when provided', () => {
      const payload = buildPayload({ correlationId: 'corr-1' });
      expect(payload.correlationId).toBe('corr-1');
    });
  });

  describe('NoopBattleEventPublisher', () => {
    it('logs and resolves without throwing', async () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
      await expect(new NoopBattleEventPublisher().publish(buildPayload())).resolves.toBeUndefined();
      infoSpy.mockRestore();
    });
  });

  describe('SnsBattleEventPublisher', () => {
    it('sends the serialized payload to SNS', async () => {
      const send = vi.fn().mockResolvedValue({});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
      const publisher = new SnsBattleEventPublisher({ send } as never, 'arn:topic');
      const payload = buildPayload();

      await publisher.publish(payload);

      expect(send).toHaveBeenCalledTimes(1);
      const command = send.mock.calls[0]?.[0];
      expect(command.input).toMatchObject({
        TopicArn: 'arn:topic',
        Message: JSON.stringify(payload),
      });
      infoSpy.mockRestore();
    });

    it('propagates SNS send failures', async () => {
      const send = vi.fn().mockRejectedValue(new Error('SNS unavailable'));
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
      const publisher = new SnsBattleEventPublisher({ send } as never, 'arn:topic');

      await expect(publisher.publish(buildPayload())).rejects.toThrow('SNS unavailable');
      infoSpy.mockRestore();
    });
  });

  describe('RedisBattleEventPublisher', () => {
    it('publishes the serialized payload to the Redis channel', async () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
      const publisher = new RedisBattleEventPublisher('redis://localhost:6379', 'room-character-events');
      const payload = buildPayload();

      await publisher.publish(payload);

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'room-character-events',
        JSON.stringify(payload)
      );
      infoSpy.mockRestore();
    });

    it('propagates Redis publish failures', async () => {
      mockRedisClient.publish.mockRejectedValueOnce(new Error('Redis down'));
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
      const publisher = new RedisBattleEventPublisher('redis://localhost:6379', 'room-character-events');

      await expect(publisher.publish(buildPayload())).rejects.toThrow('Redis down');
      infoSpy.mockRestore();
    });
  });
});
