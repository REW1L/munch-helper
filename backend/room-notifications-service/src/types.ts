export type CharacterNotificationEventType = 'character_created' | 'character_updated' | 'character_deleted';
export type BattleNotificationEventType = 'battle_started' | 'battle_updated' | 'battle_concluded' | 'battle_discarded';
export type NotificationEventType = CharacterNotificationEventType | BattleNotificationEventType;

export type CharacterEventBody = { characterId: string };
export type BattleEventBody = { battleId: string };

export interface RoomNotificationEvent {
  event: NotificationEventType;
  roomId: string;
  event_body: CharacterEventBody | BattleEventBody;
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
