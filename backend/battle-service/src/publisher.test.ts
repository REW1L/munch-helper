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
  FanOutBattleEventPublisher,
  NoopBattleEventPublisher,
  RedisBattleEventPublisher,
  SnsBattleEventPublisher,
  createBattleConcludedEventPayload,
  createBattleDiscardedEventPayload,
  createBattleEventPayload,
  createBattleStartedEventPayload,
  createBattleUpdatedEventPayload,
} from './publisher';
import type { BattleLike } from './app';

const buildBattle = (overrides: Partial<BattleLike> = {}): BattleLike => {
  const now = new Date('2026-05-17T12:00:00.000Z');
  return {
    id: 'battle-1',
    roomId: 'room-1',
    name: 'Dungeon Door',
    status: 'active',
    playerSide: { characterIds: ['character-1'], bonuses: [{ id: 'bonus-1', value: 2 }] },
    monsterSide: { monsters: [{ id: 'monster-1', name: 'Fungeater', level: 5 }], bonuses: [] },
    result: null,
    concludedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

const buildPayload = (overrides: Partial<{ event: 'battle_started'; correlationId: string; battle: BattleLike }> = {}) =>
  createBattleEventPayload({
    event: 'battle_started',
    battle: buildBattle(),
    ...overrides,
  });

describe('battle event publisher', () => {
  describe('createBattleEventPayload', () => {
    it('produces the legacy notifications fields, canonical mirrors, and battle snapshot', () => {
      const payload = buildPayload();
      expect(payload).toMatchObject({
        event: 'battle_started',
        eventType: 'battle_started',
        roomId: 'room-1',
        battleId: 'battle-1',
        actorId: 'battle-1',
        event_body: { battleId: 'battle-1' },
        battle: {
          id: 'battle-1',
          name: 'Dungeon Door',
          status: 'active',
          result: null,
          playerSide: { characterIds: ['character-1'], bonuses: [{ id: 'bonus-1', value: 2 }] },
          monsterSide: { monsters: [{ id: 'monster-1', name: 'Fungeater', level: 5 }], bonuses: [] },
        },
      });
      expect(typeof payload.emittedAt).toBe('string');
      expect(payload.occurredAt).toBe(payload.emittedAt);
      expect(payload.correlationId).toBeUndefined();
    });

    it('includes correlationId when provided', () => {
      const payload = buildPayload({ correlationId: 'corr-1' });
      expect(payload.correlationId).toBe('corr-1');
    });

    it('creates enriched lifecycle and update payloads from post-transition snapshots', () => {
      const concluded = buildBattle({ status: 'concluded', result: 'players_win' });
      const discarded = buildBattle({ status: 'discarded' });

      expect(createBattleStartedEventPayload({ battle: buildBattle() })).toMatchObject({
        event: 'battle_started',
        battle: { status: 'active', result: null },
      });
      expect(createBattleUpdatedEventPayload({ battle: buildBattle({ name: 'New Name' }) })).toMatchObject({
        event: 'battle_updated',
        battle: { name: 'New Name' },
      });
      expect(createBattleConcludedEventPayload({ battle: concluded })).toMatchObject({
        event: 'battle_concluded',
        battle: { status: 'concluded', result: 'players_win' },
      });
      expect(createBattleDiscardedEventPayload({ battle: discarded })).toMatchObject({
        event: 'battle_discarded',
        battle: { status: 'discarded', result: null },
      });
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

  describe('FanOutBattleEventPublisher', () => {
    it('publishes lifecycle events to notifications and log legs in parallel without propagating failures', async () => {
      const notifications = { publish: vi.fn().mockRejectedValue(new Error('notifications down')) };
      const log = { publish: vi.fn().mockResolvedValue(undefined) };
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const publisher = new FanOutBattleEventPublisher([
        { target: 'notifications', publisher: notifications },
        { target: 'log', publisher: log },
      ]);
      const payload = createBattleConcludedEventPayload({ battle: buildBattle({ status: 'concluded', result: 'monster_wins' }) });

      await expect(publisher.publish(payload)).resolves.toBeUndefined();

      expect(notifications.publish).toHaveBeenCalledWith(payload);
      expect(log.publish).toHaveBeenCalledWith(payload);
      expect(errorSpy).toHaveBeenCalledWith('[battle-events] publisher leg failed', expect.objectContaining({
        target: 'notifications',
        event: 'battle_concluded',
      }));
      errorSpy.mockRestore();
    });

    it('publishes battle_updated to notifications only', async () => {
      const notifications = { publish: vi.fn().mockResolvedValue(undefined) };
      const log = { publish: vi.fn().mockResolvedValue(undefined) };
      const publisher = new FanOutBattleEventPublisher([
        { target: 'notifications', publisher: notifications },
        { target: 'log', publisher: log },
      ]);
      const payload = createBattleUpdatedEventPayload({ battle: buildBattle() });

      await publisher.publish(payload);

      expect(notifications.publish).toHaveBeenCalledWith(payload);
      expect(log.publish).not.toHaveBeenCalled();
    });
  });
});
