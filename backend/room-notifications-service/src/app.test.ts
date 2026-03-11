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
    const parsed = parseLocalConnectionRequest('/rooms/ROOM01?userId=user-1');

    expect(parsed).toEqual({
      roomId: 'ROOM01',
      userId: 'user-1'
    });
  });

  it('parses room notification event payload', () => {
    const parsed = parseNotificationEvent({
      event: 'character_created',
      roomId: 'ROOM01',
      event_body: {
        characterId: 'char-1'
      },
      emittedAt: '2026-03-11T00:00:00.000Z'
    });

    expect(parsed).toMatchObject({
      event: 'character_created',
      roomId: 'ROOM01',
      event_body: {
        characterId: 'char-1'
      }
    });
  });
});
