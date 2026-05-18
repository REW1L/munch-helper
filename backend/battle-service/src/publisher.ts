export interface BattleEventPayload {
  event: string;
  roomId: string;
  battleId: string;
  emittedAt: string;
}

export interface BattleEventPublisher {
  publish: (payload: BattleEventPayload) => Promise<void>;
}

export class NoopBattleEventPublisher implements BattleEventPublisher {
  async publish(payload: BattleEventPayload): Promise<void> {
    console.info('[battle-events] noop publisher configured; skipping publish', {
      event: payload.event,
      roomId: payload.roomId,
      battleId: payload.battleId
    });
  }
}

export const createBattleStartedEventPayload = (input: {
  roomId: string;
  battleId: string;
}): BattleEventPayload => ({
  event: 'battle_started',
  roomId: input.roomId,
  battleId: input.battleId,
  emittedAt: new Date().toISOString()
});
