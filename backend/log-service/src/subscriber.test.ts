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
      correlationId: 'corr-1',
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
    expect(mockPersistLogEvent).toHaveBeenNthCalledWith(2, { ...validParsed, actorId: 'battle-1', eventType: 'battle_started' });
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify({ processed: 2 }) });
  });

  it('emits sanitized support.failure for invalid records', async () => {
    process.env.LOG_TOPIC_ARN = 'arn:aws:sns:log-topic';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockParseLogEvent.mockReturnValue(null);

    const { handler } = await import('./subscriber.js');
    await handler({ Records: [{ Sns: { Message: '{"name":"Hidden"}' } }] });

    expect(errorSpy).toHaveBeenCalledWith('support.failure', {
      subsystem: 'log',
      code: 'log_invalid_event',
      message: 'SNS message failed parseLogEvent',
      correlationId: null
    });
    expect(errorSpy.mock.calls[0][1]).not.toHaveProperty('message', '{"name":"Hidden"}');
    errorSpy.mockRestore();
  });

  it('continues the batch when a record fails to persist', async () => {
    process.env.LOG_TOPIC_ARN = 'arn:aws:sns:log-topic';
    const firstParsed = {
      roomId: 'room-1',
      eventType: 'character_created',
      actorId: 'char-1',
      summary: 'Ada created',
      payload: {},
      occurredAt: new Date('2026-05-20T10:00:00.000Z'),
      correlationId: 'corr-persist',
    };
    const secondParsed = { ...firstParsed, actorId: 'char-2' };
    mockParseLogEvent
      .mockReturnValueOnce(firstParsed)
      .mockReturnValueOnce(secondParsed);
    mockPersistLogEvent
      .mockRejectedValueOnce(new Error('mongo write failed'))
      .mockResolvedValueOnce(undefined);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handler } = await import('./subscriber.js');
    const response = await handler({
      Records: [
        { Sns: { Message: 'fails' } },
        { Sns: { Message: 'succeeds' } },
      ],
    });

    expect(mockPersistLogEvent).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith('support.failure', expect.objectContaining({
      subsystem: 'log',
      code: 'log_persist_failed',
      correlationId: 'corr-persist',
      roomId: 'room-1',
      actorId: 'char-1',
      errorMessage: 'mongo write failed'
    }));
    expect(response).toEqual({ statusCode: 200, body: JSON.stringify({ processed: 1 }) });
    errorSpy.mockRestore();
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
