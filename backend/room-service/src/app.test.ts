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
});