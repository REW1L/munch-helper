import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp, type AppDependencies } from './app';

function buildDeps(): AppDependencies {
  return {
    roomModel: {
      create: vi.fn(),
      findById: vi.fn(),
      deleteOne: vi.fn()
    },
    roomAssociationModel: {
      create: vi.fn(),
      findOne: vi.fn(),
      deleteMany: vi.fn()
    },
    createDefaultCharacter: vi.fn()
  };
}

describe('room-service app', () => {
  it('returns service health', async () => {
    const app = createApp(buildDeps());

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ service: 'room-service', status: 'ok' });
  });

  it('creates room and owner association', async () => {
    const deps = buildDeps();
    const now = new Date();

    vi.mocked(deps.roomModel.create).mockResolvedValue({
      id: 'r1',
      roomTypeId: 'munchkin',
      createdAt: now
    });
    vi.mocked(deps.createDefaultCharacter).mockResolvedValue({ id: 'c1' });
    vi.mocked(deps.roomAssociationModel.create).mockResolvedValue({
      roomId: 'r1',
      userId: 'u1',
      characterId: 'c1',
      createdAt: now
    });

    const app = createApp(deps);
    const response = await request(app)
      .post('/rooms')
      .send({ roomTypeId: 'munchkin', userId: 'u1', userName: 'Alice', avatarId: 2 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ roomId: 'r1', userId: 'u1', characterId: 'c1' });
  });

  it('rejects unsupported room types and missing owners', async () => {
    const app = createApp(buildDeps());

    const unsupportedTypeResponse = await request(app).post('/rooms').send({ roomTypeId: 'other', userId: 'u1' });
    const missingUserResponse = await request(app).post('/rooms').send({ roomTypeId: 'munchkin' });

    expect(unsupportedTypeResponse.status).toBe(400);
    expect(missingUserResponse.status).toBe(400);
  });

  it('rolls back room creation when owner character creation fails', async () => {
    const deps = buildDeps();
    const now = new Date();

    vi.mocked(deps.roomModel.create).mockResolvedValue({
      id: 'r-rollback',
      roomTypeId: 'munchkin',
      createdAt: now,
    });
    vi.mocked(deps.createDefaultCharacter).mockRejectedValue(new Error('character create failed'));

    const app = createApp(deps);
    const response = await request(app).post('/rooms').send({ roomTypeId: 'munchkin', userId: 'u1' });

    expect(response.status).toBe(502);
    expect(deps.roomAssociationModel.deleteMany).toHaveBeenCalledWith({ roomId: 'r-rollback' });
    expect(deps.roomModel.deleteOne).toHaveBeenCalledWith({ _id: 'r-rollback' });
  });

  it('returns 404 when joining unknown room', async () => {
    const deps = buildDeps();
    vi.mocked(deps.roomModel.findById).mockResolvedValue(null);

    const app = createApp(deps);
    const response = await request(app).post('/rooms/associations').send({ roomId: 'missing', userId: 'u2' });

    expect(response.status).toBe(404);
  });

  it('returns existing association when already joined', async () => {
    const deps = buildDeps();
    const now = new Date();

    vi.mocked(deps.roomModel.findById).mockResolvedValue({
      id: 'r2',
      roomTypeId: 'munchkin',
      createdAt: now
    });
    vi.mocked(deps.roomAssociationModel.findOne).mockResolvedValue({
      roomId: 'r2',
      userId: 'u2',
      characterId: 'c2',
      createdAt: now
    });

    const app = createApp(deps);
    const response = await request(app).post('/rooms/associations').send({ roomId: 'r2', userId: 'u2' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ roomId: 'r2', alreadyJoined: true });
  });

  it('creates a new room association when joining for the first time', async () => {
    const deps = buildDeps();
    const now = new Date();

    vi.mocked(deps.roomModel.findById).mockResolvedValue({
      id: 'r3',
      roomTypeId: 'munchkin',
      createdAt: now,
    });
    vi.mocked(deps.roomAssociationModel.findOne).mockResolvedValue(null);
    vi.mocked(deps.createDefaultCharacter).mockResolvedValue({ id: 'c3' });
    vi.mocked(deps.roomAssociationModel.create).mockResolvedValue({
      roomId: 'r3',
      userId: 'u3',
      characterId: 'c3',
      createdAt: now,
    });

    const app = createApp(deps);
    const response = await request(app)
      .post('/rooms/associations')
      .send({ roomId: 'r3', userId: 'u3', userName: 'Cara', avatarId: 6 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ roomId: 'r3', userId: 'u3', characterId: 'c3', alreadyJoined: false });
  });

  it('returns 502 when joining fails during character creation', async () => {
    const deps = buildDeps();
    const now = new Date();

    vi.mocked(deps.roomModel.findById).mockResolvedValue({
      id: 'r4',
      roomTypeId: 'munchkin',
      createdAt: now,
    });
    vi.mocked(deps.roomAssociationModel.findOne).mockResolvedValue(null);
    vi.mocked(deps.createDefaultCharacter).mockRejectedValue(new Error('join character failed'));

    const app = createApp(deps);
    const response = await request(app).post('/rooms/associations').send({ roomId: 'r4', userId: 'u4' });

    expect(response.status).toBe(502);
    expect(response.body).toMatchObject({ message: 'Failed to create default character while joining room' });
  });
});