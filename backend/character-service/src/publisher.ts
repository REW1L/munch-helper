import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { createClient } from 'redis';

export type CharacterEventType = 'character_created' | 'character_updated' | 'character_deleted';

export interface CharacterEventPayload {
  event: CharacterEventType;
  roomId: string;
  event_body: {
    characterId: string;
  };
  emittedAt: string;
  correlationId?: string;
}

export interface CharacterEventPublisher {
  publish: (payload: CharacterEventPayload) => Promise<void>;
}

export class NoopCharacterEventPublisher implements CharacterEventPublisher {
  async publish(_payload: CharacterEventPayload): Promise<void> { }
}

export class SnsCharacterEventPublisher implements CharacterEventPublisher {
  constructor(
    private readonly snsClient: SNSClient,
    private readonly topicArn: string
  ) { }

  async publish(payload: CharacterEventPayload): Promise<void> {
    await this.snsClient.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(payload)
      })
    );
  }
}

export class RedisCharacterEventPublisher implements CharacterEventPublisher {
  private readonly client;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly redisUrl: string,
    private readonly channel: string
  ) {
    this.client = createClient({ url: this.redisUrl });
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().then(() => undefined).catch((error) => {
        this.connectPromise = null;
        throw error;
      });
    }

    await this.connectPromise;
  }

  async publish(payload: CharacterEventPayload): Promise<void> {
    await this.ensureConnected();
    await this.client.publish(this.channel, JSON.stringify(payload));
  }
}

export const createCharacterEventPayload = (input: {
  event: CharacterEventType;
  roomId: string;
  characterId: string;
  correlationId?: string;
}): CharacterEventPayload => ({
  event: input.event,
  roomId: input.roomId,
  event_body: {
    characterId: input.characterId
  },
  emittedAt: new Date().toISOString(),
  correlationId: input.correlationId
});
