import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp, type CharacterModelLike } from './app';

function buildCharacterModel(): CharacterModelLike {
  return {
    find: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn()
  };
}

describe('character-service app', () => {
  it('lists characters by roomId', async () => {
    const model = buildCharacterModel();
    const now = new Date();
    vi.mocked(model.find).mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: 'c1',
          roomId: 'r1',
          userId: 'u1',
          name: 'Hero',
          avatarId: 1,
          color: '#AABBCC',
          level: 1,
          power: 0,
          class: '',
          race: '',
          gender: '',
          createdAt: now,
          updatedAt: now
        }
      ])
    });

    const app = createApp(model);
    const response = await request(app).get('/characters').query({ roomId: 'r1' });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({ id: 'c1', roomId: 'r1', color: '#AABBCC' });
  });

  it('creates character', async () => {
    const model = buildCharacterModel();
    const now = new Date();
    vi.mocked(model.create).mockResolvedValue({
      id: 'c2',
      roomId: 'r2',
      userId: 'u2',
      name: 'Mage',
      avatarId: 4,
      color: '#00AAFF',
      level: 1,
      power: 0,
      class: '',
      race: '',
      gender: '',
      createdAt: now,
      updatedAt: now
    });

    const app = createApp(model);
    const response = await request(app)
      .post('/characters')
      .send({ roomId: 'r2', userId: 'u2', name: 'Mage', avatarId: 4, color: '#00aaff' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: 'c2', roomId: 'r2', name: 'Mage', color: '#00AAFF' });
  });

  it('rejects create without color', async () => {
    const model = buildCharacterModel();
    const app = createApp(model);

    const response = await request(app).post('/characters').send({ roomId: 'r2', userId: 'u2', name: 'Mage', avatarId: 4 });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('color');
  });

  it('deletes character', async () => {
    const model = buildCharacterModel();
    const now = new Date();
    vi.mocked(model.findByIdAndDelete).mockResolvedValue({
      id: 'c3',
      roomId: 'r3',
      userId: null,
      name: 'Rogue',
      avatarId: 2,
      color: '#FFFFFF',
      level: 1,
      power: 0,
      class: '',
      race: '',
      gender: '',
      createdAt: now,
      updatedAt: now
    });

    const app = createApp(model);
    const response = await request(app).delete('/characters/c3');

    expect(response.status).toBe(204);
  });
});