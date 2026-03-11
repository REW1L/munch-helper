export type CharacterNotificationEventType = 'character_created' | 'character_updated' | 'character_deleted';

export interface RoomCharacterNotificationEvent {
  event: CharacterNotificationEventType;
  roomId: string;
  event_body: {
    characterId: string;
  };
  emittedAt: string;
  correlationId?: string;
}

export interface ConnectionRecord {
  connectionId: string;
  roomId: string;
  userId: string;
  connectedAt: Date;
  updatedAt: Date;
}
