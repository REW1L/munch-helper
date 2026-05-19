import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { createClient } from 'redis';

export type BattleEventType = 'battle_started' | 'battle_updated' | 'battle_concluded' | 'battle_discarded';

export interface BattleEventPayload {
  event: BattleEventType;
  roomId: string;
  event_body: {
    battleId: string;
  };
  emittedAt: string;
  correlationId?: string;
}

export interface BattleEventPublisher {
  publish: (payload: BattleEventPayload) => Promise<void>;
}

export class NoopBattleEventPublisher implements BattleEventPublisher {
  async publish(payload: BattleEventPayload): Promise<void> {
    console.info('[battle-events] noop publisher configured; skipping publish', {
      event: payload.event,
      roomId: payload.roomId,
      battleId: payload.event_body.battleId,
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
      battleId: payload.event_body.battleId,
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
      battleId: payload.event_body.battleId,
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
      battleId: payload.event_body.battleId,
      correlationId: payload.correlationId
    });
    await this.client.publish(this.channel, JSON.stringify(payload));
    console.info('[battle-events] published to Redis', {
      channel: this.channel,
      event: payload.event,
      roomId: payload.roomId,
      battleId: payload.event_body.battleId,
      correlationId: payload.correlationId
    });
  }
}

export const createBattleEventPayload = (input: {
  event: BattleEventType;
  roomId: string;
  battleId: string;
  correlationId?: string;
}): BattleEventPayload => ({
  event: input.event,
  roomId: input.roomId,
  event_body: {
    battleId: input.battleId
  },
  emittedAt: new Date().toISOString(),
  correlationId: input.correlationId
});

export const createBattleStartedEventPayload = (input: {
  roomId: string;
  battleId: string;
}): BattleEventPayload => createBattleEventPayload({ event: 'battle_started', ...input });

export const createBattleUpdatedEventPayload = (input: {
  roomId: string;
  battleId: string;
}): BattleEventPayload => createBattleEventPayload({ event: 'battle_updated', ...input });
