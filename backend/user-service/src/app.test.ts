import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp, type UserModelLike } from './app';

function buildUserModel(): UserModelLike {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn()
  };
}

describe('user-service app', () => {
  it('returns service health', async () => {
    const app = createApp(buildUserModel());

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ service: 'user-service', status: 'ok' });
  });

  it('creates user with valid payload', async () => {
    const userModel = buildUserModel();
    const now = new Date();
    vi.mocked(userModel.create).mockResolvedValue({
      id: 'u1',
      name: 'Alice',
      avatarId: 2,
      createdAt: now,
      updatedAt: now
    });

    const app = createApp(userModel);
    const response = await request(app).post('/users').send({ name: 'Alice', avatarId: 2 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: 'u1', name: 'Alice', avatarId: 2 });
  });

  it('rejects invalid create payload', async () => {
    const app = createApp(buildUserModel());
    const response = await request(app).post('/users').send({ name: '', avatarId: 'x' });

    expect(response.status).toBe(400);
  });

  it('updates user via patch', async () => {
    const userModel = buildUserModel();
    const now = new Date();
    vi.mocked(userModel.findByIdAndUpdate).mockResolvedValue({
      id: 'u1',
      name: 'Alice Updated',
      avatarId: 3,
      createdAt: now,
      updatedAt: now
    });

    const app = createApp(userModel);
    const response = await request(app).patch('/users/u1').send({ name: 'Alice Updated', avatarId: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 'u1', name: 'Alice Updated', avatarId: 3 });
  });

  it('gets an existing user and returns 404 when missing', async () => {
    const userModel = buildUserModel();
    const now = new Date();
    vi.mocked(userModel.findById)
      .mockResolvedValueOnce({
        id: 'u1',
        name: 'Alice',
        avatarId: 2,
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce(null);

    const app = createApp(userModel);

    const foundResponse = await request(app).get('/users/u1');
    const missingResponse = await request(app).get('/users/missing');

    expect(foundResponse.status).toBe(200);
    expect(foundResponse.body).toMatchObject({ id: 'u1', name: 'Alice', avatarId: 2 });
    expect(missingResponse.status).toBe(404);
  });

  it('rejects invalid update payloads', async () => {
    const app = createApp(buildUserModel());

    const response = await request(app).patch('/users/u1').send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'No valid fields provided for update' });
  });
});