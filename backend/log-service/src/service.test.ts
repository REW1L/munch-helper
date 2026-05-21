import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLogEventCreate } = vi.hoisted(() => ({
  mockLogEventCreate: vi.fn(),
}));

vi.mock('./models/LogEvent', () => ({
  LogEvent: {
    create: mockLogEventCreate,
  },
}));

describe('log-service service', () => {
  beforeEach(() => {
    mockLogEventCreate.mockReset();
    vi.useRealTimers();
  });

  it('maps and persists each supported event type', async () => {
    const { parseLogEvent, persistLogEvent } = await import('./service.js');
    const payloads = [
      {
        eventType: 'character_created',
        roomId: ' room-1 ',
        actorId: 'char-1',
        occurredAt: '2026-05-20T10:00:00.000Z',
        character: { id: 'char-1', name: 'Ada', avatarId: 1, color: '#fff' },
      },
      {
        eventType: 'character_updated',
        roomId: 'room-1',
        actorId: 'char-1',
        occurredAt: '2026-05-20T10:01:00.000Z',
        character: { id: 'char-1', name: 'Ada', avatarId: 1, color: '#fff' },
        changes: { level: { prev: 1, next: 2 } },
      },
      {
        eventType: 'character_deleted',
        roomId: 'room-1',
        actorId: 'char-1',
        occurredAt: '2026-05-20T10:02:00.000Z',
        character: { id: 'char-1', name: 'Ada', avatarId: 1, color: '#fff' },
      },
      {
        eventType: 'battle_started',
        roomId: 'room-1',
        actorId: 'battle-1',
        occurredAt: '2026-05-20T10:03:00.000Z',
        name: 'Door',
      },
      {
        eventType: 'battle_concluded',
        roomId: 'room-1',
        actorId: 'battle-1',
        occurredAt: '2026-05-20T10:04:00.000Z',
        name: 'Door',
        result: 'players_win',
      },
      {
        eventType: 'battle_discarded',
        roomId: 'room-1',
        actorId: 'battle-1',
        occurredAt: '2026-05-20T10:05:00.000Z',
        name: 'Door',
      },
    ];

    for (const payload of payloads) {
      const parsed = parseLogEvent(payload);
      expect(parsed).toEqual(expect.objectContaining({
        roomId: 'room-1',
        eventType: payload.eventType,
        actorId: payload.actorId,
        payload,
      }));
      await persistLogEvent(parsed!);
    }

    expect(mockLogEventCreate).toHaveBeenCalledTimes(6);
    expect(mockLogEventCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      roomId: 'room-1',
      eventType: 'character_created',
      actorId: 'char-1',
      summary: 'Ada created',
      payload: payloads[0],
      occurredAt: new Date('2026-05-20T10:00:00.000Z'),
    }));
    expect(mockLogEventCreate).toHaveBeenNthCalledWith(5, expect.objectContaining({
      eventType: 'battle_concluded',
      summary: "Battle 'Door' concluded — players_win",
    }));
  });

  it('uses legacy payload fields and parses JSON strings', async () => {
    const { parseLogEvent } = await import('./service.js');

    const parsed = parseLogEvent(JSON.stringify({
      event: 'character_created',
      roomId: 'room-legacy',
      event_body: { characterId: 'char-legacy' },
      emittedAt: '2026-05-20T11:00:00.000Z',
    }));

    expect(parsed).toEqual(expect.objectContaining({
      roomId: 'room-legacy',
      eventType: 'character_created',
      actorId: 'char-legacy',
      occurredAt: new Date('2026-05-20T11:00:00.000Z'),
      summary: 'char-legacy created',
    }));
  });

  it('falls back to the current time for missing occurredAt', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));
    const { parseLogEvent } = await import('./service.js');

    const parsed = parseLogEvent({
      eventType: 'battle_started',
      roomId: 'room-1',
      event_body: { battleId: 'battle-1' },
    });

    expect(parsed?.occurredAt).toEqual(new Date('2026-05-20T12:00:00.000Z'));
  });

  it('falls back to the current time when occurredAt is unparseable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));
    const { parseLogEvent } = await import('./service.js');

    const parsed = parseLogEvent({
      eventType: 'character_created',
      roomId: 'room-1',
      actorId: 'char-1',
      occurredAt: 'not-a-real-date',
      character: { id: 'char-1', name: 'Ada', avatarId: 1, color: '#fff' },
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.occurredAt).toEqual(new Date('2026-05-20T12:00:00.000Z'));
  });

  it('renders character change summaries with every changed field', async () => {
    const { parseLogEvent } = await import('./service.js');

    const parsed = parseLogEvent({
      eventType: 'character_updated',
      roomId: 'room-1',
      actorId: 'char-1',
      character: { id: 'char-1', name: 'Ada', avatarId: 1, color: '#fff' },
      changes: {
        level: { prev: 3, next: 4 },
        name: { prev: 'Ada', next: 'Ada Prime' },
      },
    });

    expect(parsed?.summary).toBe('Ada updated: level 3 → 4, name Ada → Ada Prime');
  });

  it('skips unsupported and malformed payloads without writing', async () => {
    const { parseLogEvent, persistLogEvent } = await import('./service.js');

    expect(parseLogEvent({ eventType: 'battle_updated', roomId: 'room-1', actorId: 'battle-1' })).toBeNull();
    expect(parseLogEvent({ eventType: 'character_created', actorId: 'char-1' })).toBeNull();
    expect(parseLogEvent('{bad json')).toBeNull();
    expect(parseLogEvent(null)).toBeNull();

    expect(mockLogEventCreate).not.toHaveBeenCalled();
    await expect(persistLogEvent({
      roomId: 'room-1',
      eventType: 'character_created',
      actorId: 'char-1',
      summary: 'Ada created',
      payload: {},
      occurredAt: new Date('2026-05-20T10:00:00.000Z'),
    })).resolves.toBeUndefined();
  });

  it('builds summaries with missing optional fields without throwing', async () => {
    const { buildSummary } = await import('./service.js');

    expect(buildSummary({ eventType: 'character_updated', actorId: 'char-1', payload: {} })).toBe('char-1 updated');
    expect(buildSummary({ eventType: 'battle_started', actorId: 'battle-1', payload: {} })).toBe('Battle started');
    expect(buildSummary({ eventType: 'battle_discarded', actorId: 'battle-1', payload: { battle: { name: 'Side Door' } } }))
      .toBe("Battle 'Side Door' discarded");
  });
});
