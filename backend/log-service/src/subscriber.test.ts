import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConnectToMongo, mockParseLogEvent, mockPersistLogEvent } = vi.hoisted(() => ({
  mockConnectToMongo: vi.fn(),
  mockParseLogEvent: vi.fn(),
  mockPersistLogEvent: vi.fn(),
}));

vi.mock('./db', () => ({
  connectToMongo: mockConnectToMongo,
}));

vi.mock('./service', () => ({
  parseLogEvent: mockParseLogEvent,
  persistLogEvent: mockPersistLogEvent,
}));

describe('log-service subscriber', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnectToMongo.mockReset();
    mockParseLogEvent.mockReset();
    mockPersistLogEvent.mockReset();
    delete process.env.LOG_TOPIC_ARN;
    delete process.env.LOG_MONGO_URI;
  });

  it('fails fast when LOG_TOPIC_ARN is missing', async () => {
    await expect(import('./subscriber.js')).rejects.toThrow('LOG_TOPIC_ARN is required for log-service logWriter');
  });

  it('persists valid records and skips invalid records in the same batch', async () => {
    process.env.LOG_TOPIC_ARN = 'arn:aws:sns:log-topic';
    const validParsed = {
      roomId: 'room-1',
      eventType: 'character_created',
      actorId: 'char-1',
      summary: 'Ada created',
      payload: {},
      occurredAt: new Date('2026-05-20T10:00:00.000Z'),
    };
    mockParseLogEvent
      .mockReturnValueOnce(validParsed)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ ...validParsed, actorId: 'battle-1', eventType: 'battle_started' });

    const { handler } = await import('./subscriber.js');
    const response = await handler({
      Records: [
        { Sns: { Message: 'valid-1' } },
        { Sns: { Message: 'invalid' } },
        { Sns: { Message: 'valid-2' } },
      ],
    });

    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://localhost:27017/munch_log_service');
    expect(mockParseLogEvent).toHaveBeenCalledTimes(3);
    expect(mockPersistLogEvent).toHaveBeenCalledTimes(2);
    expect(mockPersistLogEvent).toHaveBeenNthCalledWith(1, validParsed);
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify({ processed: 2 }) });
  });

  it('connects to the configured log Mongo URI', async () => {
    process.env.LOG_TOPIC_ARN = 'arn:aws:sns:log-topic';
    process.env.LOG_MONGO_URI = 'mongodb://mongo/logs';
    mockParseLogEvent.mockReturnValue(null);

    const { handler } = await import('./subscriber.js');
    await handler({ Records: [{ Sns: { Message: 'invalid' } }] });

    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://mongo/logs');
  });
});
