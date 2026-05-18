import { describe, expect, it, vi } from 'vitest';
import { NoopBattleEventPublisher, createBattleStartedEventPayload } from './publisher';

describe('battle event publisher', () => {
  it('creates a battle started payload and no-ops publish', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const payload = createBattleStartedEventPayload({ roomId: 'room-1', battleId: 'battle-1' });

    expect(payload).toMatchObject({ event: 'battle_started', roomId: 'room-1', battleId: 'battle-1' });
    await expect(new NoopBattleEventPublisher().publish(payload)).resolves.toBeUndefined();

    infoSpy.mockRestore();
  });
});
