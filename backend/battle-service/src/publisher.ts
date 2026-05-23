import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { createClient } from 'redis';
import type { BattleLike, BattleResult, BattleStatus, BonusItem, MonsterItem } from './app';

export type BattleEventType = 'battle_started' | 'battle_updated' | 'battle_concluded' | 'battle_discarded';

export interface BattleEventPayload {
  event: BattleEventType;
  eventType: BattleEventType;
  roomId: string;
  battleId: string;
  actorId: string;
  event_body: {
    battleId: string;
  };
  emittedAt: string;
  occurredAt: string;
  correlationId?: string;
  battle: {
    id: string;
    name: string;
    status: BattleStatus;
    result: BattleResult;
    playerSide: {
      characterIds: string[];
      bonuses: BonusItem[];
    };
    monsterSide: {
      monsters: MonsterItem[];
      bonuses: BonusItem[];
    };
  };
}

export interface BattleEventPublisher {
  publish: (payload: BattleEventPayload) => Promise<void>;
}

export class NoopBattleEventPublisher implements BattleEventPublisher {
  async publish(payload: BattleEventPayload): Promise<void> {
    console.info('[battle-events] noop publisher configured; skipping publish', {
      event: payload.event,
      roomId: payload.roomId,
      battleId: payload.battleId,
      correlationId: payload.correlationId
    });
  }
}

export class SnsBattleEventPublisher implements BattleEventPublisher {
  constructor(
    private readonly snsClient: SNSClient,
    private readonly topicArn: string
  ) { }

  async publish(payload: BattleEventPayload): Promise<void> {
    console.info('[battle-events] publishing to SNS', {
      topicArn: this.topicArn,
      event: payload.event,
      roomId: payload.roomId,
      battleId: payload.battleId,
      correlationId: payload.correlationId
    });

    await this.snsClient.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(payload)
      })
    );

    console.info('[battle-events] published to SNS', {
      topicArn: this.topicArn,
      event: payload.event,
      roomId: payload.roomId,
      battleId: payload.battleId,
      correlationId: payload.correlationId
    });
  }
}

export class RedisBattleEventPublisher implements BattleEventPublisher {
  private readonly client;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly redisUrl: string,
    private readonly channel: string
  ) {
    this.client = createClient({ url: this.redisUrl });
    this.client.on('error', (error) => {
      console.error('[battle-events] redis client error', {
        channel: this.channel,
        redisUrl: this.redisUrl,
        error
      });
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }

    if (!this.connectPromise) {
      console.info('[battle-events] connecting to Redis', {
        channel: this.channel,
        redisUrl: this.redisUrl
      });
      this.connectPromise = this.client.connect().then(() => undefined).catch((error) => {
        this.connectPromise = null;
        throw error;
      });
    }

    await this.connectPromise;
  }

  async publish(payload: BattleEventPayload): Promise<void> {
    await this.ensureConnected();
    console.info('[battle-events] publishing to Redis', {
      channel: this.channel,
      event: payload.event,
      roomId: payload.roomId,
      battleId: payload.battleId,
      correlationId: payload.correlationId
    });
    await this.client.publish(this.channel, JSON.stringify(payload));
    console.info('[battle-events] published to Redis', {
      channel: this.channel,
      event: payload.event,
      roomId: payload.roomId,
      battleId: payload.battleId,
      correlationId: payload.correlationId
    });
  }
}

type BattleEventPublisherLeg = {
  target: 'notifications' | 'log';
  publisher: BattleEventPublisher;
};

const lifecycleLogEvents = new Set<BattleEventType>(['battle_started', 'battle_concluded', 'battle_discarded']);

export class FanOutBattleEventPublisher implements BattleEventPublisher {
  constructor(private readonly legs: BattleEventPublisherLeg[]) { }

  async publish(payload: BattleEventPayload): Promise<void> {
    const eligibleLegs = this.legs.filter((leg) => leg.target !== 'log' || lifecycleLogEvents.has(payload.eventType));
    const results = await Promise.allSettled(eligibleLegs.map((leg) => leg.publisher.publish(payload)));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const leg = eligibleLegs[index];
        console.error('[battle-events] publisher leg failed', {
          target: leg?.target,
          event: payload.event,
          roomId: payload.roomId,
          battleId: payload.battleId,
          error: result.reason
        });
      }
    });
  }
}

const toBattleSnapshot = (battle: BattleLike): BattleEventPayload['battle'] => ({
  id: battle.id,
  name: battle.name,
  status: battle.status,
  result: battle.result,
  playerSide: {
    characterIds: [...battle.playerSide.characterIds],
    bonuses: battle.playerSide.bonuses.map((bonus) => ({ ...bonus }))
  },
  monsterSide: {
    monsters: battle.monsterSide.monsters.map((monster) => ({ ...monster })),
    bonuses: battle.monsterSide.bonuses.map((bonus) => ({ ...bonus }))
  }
});

export const createBattleEventPayload = (input: {
  event: BattleEventType;
  battle: BattleLike;
  correlationId?: string;
}): BattleEventPayload => {
  const emittedAt = new Date().toISOString();
  return {
    event: input.event,
    eventType: input.event,
    roomId: input.battle.roomId,
    battleId: input.battle.id,
    actorId: input.battle.id,
    event_body: {
      battleId: input.battle.id
    },
    emittedAt,
    occurredAt: emittedAt,
    correlationId: input.correlationId,
    battle: toBattleSnapshot(input.battle)
  };
};

export const createBattleStartedEventPayload = (input: {
  battle: BattleLike;
  correlationId?: string;
}): BattleEventPayload => createBattleEventPayload({ event: 'battle_started', ...input });

export const createBattleUpdatedEventPayload = (input: {
  battle: BattleLike;
  correlationId?: string;
}): BattleEventPayload => createBattleEventPayload({ event: 'battle_updated', ...input });

export const createBattleConcludedEventPayload = (input: {
  battle: BattleLike;
  correlationId?: string;
}): BattleEventPayload => createBattleEventPayload({ event: 'battle_concluded', ...input });

export const createBattleDiscardedEventPayload = (input: {
  battle: BattleLike;
  correlationId?: string;
}): BattleEventPayload => createBattleEventPayload({ event: 'battle_discarded', ...input });
