import { describe, expect, it } from 'vitest';
import { parseConnectRequest, parseLocalConnectionRequest, parseNotificationEvent } from './app';

describe('room-notifications app helpers', () => {
  it('parses cloud connect requests', () => {
    const parsed = parseConnectRequest({
      requestContext: { connectionId: 'abc123' },
      queryStringParameters: { roomId: 'ROOM01', userId: 'user-1' }
    });

    expect(parsed).toEqual({
      connectionId: 'abc123',
      roomId: 'ROOM01',
      userId: 'user-1'
    });
  });

  it('parses local websocket URL', () => {
    const parsed = parseLocalConnectionRequest('/ws?roomId=ROOM01&userId=user-1');

    expect(parsed).toEqual({
      roomId: 'ROOM01',
      userId: 'user-1'
    });
  });

  describe('parseNotificationEvent — character events (regression)', () => {
    it.each(['character_created', 'character_updated', 'character_deleted'] as const)(
      'parses %s with characterId',
      (eventType) => {
        const parsed = parseNotificationEvent({
          event: eventType,
          roomId: 'ROOM01',
          event_body: { characterId: 'char-1' },
          emittedAt: '2026-03-11T00:00:00.000Z'
        });

        expect(parsed).toMatchObject({
          event: eventType,
          roomId: 'ROOM01',
          event_body: { characterId: 'char-1' }
        });
      }
    );

    it('drops a character event without characterId', () => {
      expect(
        parseNotificationEvent({
          event: 'character_created',
          roomId: 'ROOM01',
          event_body: {}
        })
      ).toBeNull();
    });

    it('drops a character event with a non-string characterId', () => {
      expect(
        parseNotificationEvent({
          event: 'character_created',
          roomId: 'ROOM01',
          event_body: { characterId: 123 }
        })
      ).toBeNull();
    });
  });

  describe('parseNotificationEvent — battle events', () => {
    it.each(['battle_started', 'battle_updated', 'battle_concluded', 'battle_discarded'] as const)(
      'parses %s with battleId',
      (eventType) => {
        const parsed = parseNotificationEvent({
          event: eventType,
          roomId: 'ROOM01',
          event_body: { battleId: 'battle-1' },
          emittedAt: '2026-05-17T00:00:00.000Z'
        });

        expect(parsed).toMatchObject({
          event: eventType,
          roomId: 'ROOM01',
          event_body: { battleId: 'battle-1' }
        });
      }
    );

    it('drops a battle event without battleId', () => {
      expect(
        parseNotificationEvent({
          event: 'battle_started',
          roomId: 'ROOM01',
          event_body: {}
        })
      ).toBeNull();
    });

    it('drops a battle event with a non-string battleId', () => {
      expect(
        parseNotificationEvent({
          event: 'battle_started',
          roomId: 'ROOM01',
          event_body: { battleId: 123 }
        })
      ).toBeNull();
    });
  });

  describe('parseNotificationEvent — general rejections', () => {
    it('rejects unknown event types', () => {
      expect(
        parseNotificationEvent({ event: 'unknown_type', roomId: 'ROOM01', event_body: {} })
      ).toBeNull();
    });

    it('rejects events without roomId', () => {
      expect(
        parseNotificationEvent({
          event: 'character_created',
          event_body: { characterId: 'char-1' }
        })
      ).toBeNull();
    });

    it('parses stringified JSON payloads', () => {
      const parsed = parseNotificationEvent(
        JSON.stringify({
          event: 'battle_updated',
          roomId: 'ROOM01',
          event_body: { battleId: 'battle-1' },
          emittedAt: '2026-05-17T00:00:00.000Z'
        })
      );

      expect(parsed?.event).toBe('battle_updated');
      expect(parsed?.event_body).toEqual({ battleId: 'battle-1' });
    });
  });
});
