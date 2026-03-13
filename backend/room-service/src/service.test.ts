import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAxiosPost, mockCreateApp, mockRoom, mockRoomAssociation } = vi.hoisted(() => ({
  mockAxiosPost: vi.fn(),
  mockCreateApp: vi.fn<(
    deps: import('./app').AppDependencies,
    options?: { routePrefix?: string }
  ) => string>(() => 'room-app'),
  mockRoom: {
    create: vi.fn(),
    findById: vi.fn(),
    deleteOne: vi.fn(),
  },
  mockRoomAssociation: {
    create: vi.fn(),
    findOne: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    post: mockAxiosPost,
  },
}));

vi.mock('./app', () => ({
  createApp: mockCreateApp,
}));

vi.mock('./models/Room', () => ({
  Room: mockRoom,
  RoomAssociation: mockRoomAssociation,
}));

import { buildRoomApp, createRoomAssociationModel, createRoomModel } from './service';

describe('room-service service', () => {
  beforeEach(() => {
    mockAxiosPost.mockReset();
    mockCreateApp.mockClear();
    mockRoom.create.mockReset();
    mockRoom.findById.mockReset();
    mockRoom.deleteOne.mockReset();
    mockRoomAssociation.create.mockReset();
    mockRoomAssociation.findOne.mockReset();
    mockRoomAssociation.deleteMany.mockReset();
  });

  it('retries duplicate room id collisions during room creation', async () => {
    const createdAt = new Date('2026-03-13T00:00:00.000Z');
    mockRoom.create
      .mockRejectedValueOnce({ code: 11000 })
      .mockResolvedValueOnce({ id: 'room-1', roomTypeId: 'munchkin', createdAt });

    const model = createRoomModel();
    const result = await model.create({ roomTypeId: 'munchkin' });

    expect(mockRoom.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ id: 'room-1', roomTypeId: 'munchkin', createdAt });
  });

  it('maps room associations from the data model', async () => {
    const createdAt = new Date('2026-03-13T00:00:00.000Z');
    mockRoomAssociation.create.mockResolvedValueOnce({
      roomId: 'room-1',
      userId: 'user-1',
      characterId: 'char-1',
      createdAt,
    });
    mockRoomAssociation.findOne.mockResolvedValueOnce(null);

    const model = createRoomAssociationModel();

    await expect(model.create({ roomId: 'room-1', userId: 'user-1', characterId: 'char-1' })).resolves.toEqual({
      roomId: 'room-1',
      userId: 'user-1',
      characterId: 'char-1',
      createdAt,
    });
    await expect(model.findOne({ roomId: 'missing', userId: 'user-1' })).resolves.toBeNull();
  });

  it('builds the app with room models and a default character factory', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      status: 201,
      data: { id: 'char-1' },
    });

    const app = buildRoomApp({
      characterServiceUrl: 'http://character-service',
      characterCallTimeoutMs: 2500,
      routePrefix: '/prod',
    });

    expect(app).toBe('room-app');
    expect(mockCreateApp).toHaveBeenCalledTimes(1);
    const [dependencies, appOptions] = mockCreateApp.mock.calls[0]!;
    expect(dependencies).toEqual(
      expect.objectContaining({
        roomModel: expect.objectContaining({ create: expect.any(Function), findById: expect.any(Function), deleteOne: expect.any(Function) }),
        roomAssociationModel: expect.objectContaining({ create: expect.any(Function), findOne: expect.any(Function), deleteMany: expect.any(Function) }),
        createDefaultCharacter: expect.any(Function),
      })
    );
    expect(appOptions).toEqual({ routePrefix: '/prod' });

    await expect(
      dependencies.createDefaultCharacter({ roomId: 'room-1', userId: 'user-1', userName: ' Alice ', avatarId: 4 })
    ).resolves.toEqual({ id: 'char-1' });

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'http://character-service/characters',
      expect.objectContaining({
        roomId: 'room-1',
        userId: 'user-1',
        name: 'Alice',
        avatarId: 4,
        color: expect.stringMatching(/^#[0-9A-F]{6}$/),
      }),
      { timeout: 2500 }
    );
  });
});