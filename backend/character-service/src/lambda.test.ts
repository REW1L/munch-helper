import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConnectToMongo, mockBuildCharacterApp, mockServerFactory, mockServerHandler } = vi.hoisted(() => ({
  mockConnectToMongo: vi.fn(),
  mockBuildCharacterApp: vi.fn(() => 'character-app'),
  mockServerHandler: vi.fn(),
  mockServerFactory: vi.fn(),
}));

vi.mock('./db', () => ({
  connectToMongo: mockConnectToMongo,
}));

vi.mock('./service', () => ({
  buildCharacterApp: mockBuildCharacterApp,
}));

vi.mock('./publisher', () => ({
  FanoutCharacterEventPublisher: class FanoutCharacterEventPublisher {
    constructor(public legs: unknown[]) { }
  },
  NoopCharacterEventPublisher: class NoopCharacterEventPublisher { },
  SnsCharacterEventPublisher: class SnsCharacterEventPublisher {
    constructor(public client: unknown, public topicArn: string) { }
  },
}));

vi.mock('@codegenie/serverless-express', () => ({
  default: mockServerFactory,
}));

vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: class SNSClient {
    constructor(public options: unknown) { }
  },
}));

describe('character-service lambda', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnectToMongo.mockReset();
    mockBuildCharacterApp.mockReset();
    mockBuildCharacterApp.mockReturnValue('character-app');
    mockServerHandler.mockReset();
    mockServerFactory.mockReset();
    mockServerFactory.mockReturnValue(mockServerHandler);
    delete process.env.ROUTE_PREFIX;
    delete process.env.CHARACTER_MONGO_URI;
    delete process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN;
    delete process.env.LOG_TOPIC_ARN;
  });

  it('boots the lambda with sns publishing for notifications and logs when topic arns are configured', async () => {
    process.env.ROUTE_PREFIX = '/prod';
    process.env.CHARACTER_MONGO_URI = 'mongodb://mongo/character';
    process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN = 'arn:aws:sns:topic';
    process.env.LOG_TOPIC_ARN = 'arn:aws:sns:log-topic';
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200 });

    const { handler } = await import('./lambda.js');
    const response = await handler({ path: '/characters' }, { requestId: 'ctx' });

    expect(mockBuildCharacterApp).toHaveBeenCalledWith({
      routePrefix: '/prod',
      publisher: expect.objectContaining({
        legs: [
          expect.objectContaining({
            target: 'notifications',
            publisher: expect.objectContaining({ topicArn: 'arn:aws:sns:topic' }),
          }),
          expect.objectContaining({
            target: 'log',
            publisher: expect.objectContaining({ topicArn: 'arn:aws:sns:log-topic' }),
          }),
        ],
      }),
    });
    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://mongo/character');
    expect(mockServerHandler).toHaveBeenCalledWith({ path: '/characters' }, { requestId: 'ctx' });
    expect(response).toEqual({ statusCode: 200 });
  });

  it('boots with a noop log publisher and warns when LOG_TOPIC_ARN is absent', async () => {
    process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN = 'arn:aws:sns:topic';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200 });

    const { handler } = await import('./lambda.js');
    const response = await handler({ path: '/health' }, {});

    expect(warn).toHaveBeenCalledWith(
      '[character-service] LOG_TOPIC_ARN is not configured; room-history logging is disabled'
    );
    expect(mockBuildCharacterApp).toHaveBeenCalledWith({
      routePrefix: '/',
      publisher: expect.objectContaining({
        legs: [
          expect.objectContaining({
            target: 'notifications',
            publisher: expect.objectContaining({ topicArn: 'arn:aws:sns:topic' }),
          }),
          expect.objectContaining({
            target: 'log',
            publisher: expect.any(Object),
          }),
        ],
      }),
    });
    expect(response).toEqual({ statusCode: 200 });
    warn.mockRestore();
  });
});
