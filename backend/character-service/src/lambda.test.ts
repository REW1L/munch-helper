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
  });

  it('boots the lambda with sns publishing when a topic arn is configured', async () => {
    process.env.ROUTE_PREFIX = '/prod';
    process.env.CHARACTER_MONGO_URI = 'mongodb://mongo/character';
    process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN = 'arn:aws:sns:topic';
    mockServerHandler.mockResolvedValueOnce({ statusCode: 200 });

    const { handler } = await import('./lambda.js');
    const response = await handler({ path: '/characters' }, { requestId: 'ctx' });

    expect(mockBuildCharacterApp).toHaveBeenCalledWith({
      routePrefix: '/prod',
      publisher: expect.objectContaining({ topicArn: 'arn:aws:sns:topic' }),
    });
    expect(mockConnectToMongo).toHaveBeenCalledWith('mongodb://mongo/character');
    expect(mockServerHandler).toHaveBeenCalledWith({ path: '/characters' }, { requestId: 'ctx' });
    expect(response).toEqual({ statusCode: 200 });
  });
});