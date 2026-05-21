import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConnectToMongo, mockBuildBattleApp, mockServerFactory, mockServerHandler } = vi.hoisted(() => ({
  mockConnectToMongo: vi.fn(),
  mockBuildBattleApp: vi.fn(() => 'battle-app'),
  mockServerHandler: vi.fn(),
  mockServerFactory: vi.fn(),
}));

vi.mock('./db', () => ({
  connectToMongo: mockConnectToMongo,
}));

vi.mock('./service', () => ({
  buildBattleApp: mockBuildBattleApp,
}));

vi.mock('./publisher', () => ({
  FanOutBattleEventPublisher: class FanOutBattleEventPublisher {
    constructor(public legs: unknown[]) { }
  },
  NoopBattleEventPublisher: class NoopBattleEventPublisher { },
  SnsBattleEventPublisher: class SnsBattleEventPublisher {
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

describe('battle-service lambda', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnectToMongo.mockReset();
    mockBuildBattleApp.mockReset();
    mockBuildBattleApp.mockReturnValue('battle-app');
    mockServerHandler.mockReset();
    mockServerFactory.mockReset();
    mockServerFactory.mockReturnValue(mockServerHandler);
    delete process.env.ROUTE_PREFIX;
    delete process.env.BATTLE_MONGO_URI;
    delete process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN;
    delete process.env.LOG_TOPIC_ARN;
  });

  it('connects to battle Mongo before handling events', async () => {
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200, body: 'ok' });
    const { handler } = await import('./lambda.js');

    await expect(handler({ rawPath: '/battles' }, {})).resolves.toEqual({ statusCode: 200, body: 'ok' });
    expect(mockConnectToMongo).toHaveBeenCalled();
    expect(mockServerHandler).toHaveBeenCalledWith({ rawPath: '/battles' }, {});
  });

  it('boots the lambda with SNS publishing when a topic ARN is configured', async () => {
    process.env.ROUTE_PREFIX = '/prod';
    process.env.BATTLE_MONGO_URI = 'mongodb://mongo/battle';
    process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN = 'arn:aws:sns:topic';
    process.env.LOG_TOPIC_ARN = 'arn:aws:sns:log-topic';
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200 });

    const { handler } = await import('./lambda.js');
    const response = await handler({ path: '/battles' }, { requestId: 'ctx' });

    expect(mockBuildBattleApp).toHaveBeenCalledWith({
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
    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://mongo/battle');
    expect(response).toEqual({ statusCode: 200 });
  });

  it('boots with degraded log publisher when no log topic ARN is configured', async () => {
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200 });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { handler } = await import('./lambda.js');
    await handler({}, {});

    const calls = mockBuildBattleApp.mock.calls as unknown as Array<[{ publisher: { legs: Array<{ target: string; publisher: { constructor: { name: string } } }> } }]>;
    const call = calls[0]?.[0];
    expect(call?.publisher.legs).toEqual([
      expect.objectContaining({ target: 'notifications', publisher: expect.any(Object) }),
      expect.objectContaining({ target: 'log', publisher: expect.any(Object) }),
    ]);
    expect(call?.publisher.legs[1]?.publisher.constructor.name).toBe('NoopBattleEventPublisher');
    expect(warnSpy).toHaveBeenCalledWith('[battle-service] LOG_TOPIC_ARN not configured; degraded - battle log history will be absent');
    warnSpy.mockRestore();
  });
});
