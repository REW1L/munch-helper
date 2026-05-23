import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp, readCorrelationHeader, type CharacterModelLike } from './app';

function buildCharacterModel(): CharacterModelLike {
  return {
    find: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn()
  };
}

const buildCharacter = (overrides: Partial<ReturnType<typeof buildBaseCharacter>> = {}) => ({
  ...buildBaseCharacter(),
  ...overrides
});

const buildBaseCharacter = () => {
  const now = new Date('2026-03-13T00:00:00.000Z');
  return {
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
  };
};

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
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
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

    const app = createApp(model, { publisher });
    const response = await request(app)
      .post('/characters')
      .send({ roomId: 'r2', userId: 'u2', name: 'Mage', avatarId: 4, color: '#00aaff' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: 'c2', roomId: 'r2', name: 'Mage', color: '#00AAFF' });
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'character_created',
        eventType: 'character_created',
        roomId: 'r2',
        event_body: { characterId: 'c2' },
        actorId: 'c2',
        character: { id: 'c2', name: 'Mage', avatarId: 4, color: '#00AAFF' }
      })
    );
  });

  it('uses inbound correlation id on response and published event', async () => {
    const model = buildCharacterModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(model.create).mockResolvedValue(buildCharacter({ id: 'c-corr', roomId: 'r-corr' }));

    const response = await request(createApp(model, { publisher }))
      .post('/characters')
      .set('x-correlation-id', 'corr-header')
      .send({ roomId: 'r-corr', userId: 'u2', name: 'Mage', avatarId: 4, color: '#00aaff' });

    expect(response.status).toBe(201);
    expect(response.headers['x-correlation-id']).toBe('corr-header');
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ correlationId: 'corr-header' }));
  });

  it('falls back to x-request-id for published correlation id', async () => {
    const model = buildCharacterModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(model.create).mockResolvedValue(buildCharacter({ id: 'c-corr', roomId: 'r-corr' }));

    const response = await request(createApp(model, { publisher }))
      .post('/characters')
      .set('x-request-id', 'request-header')
      .send({ roomId: 'r-corr', userId: 'u2', name: 'Mage', avatarId: 4, color: '#00aaff' });

    expect(response.headers['x-correlation-id']).toBe('request-header');
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ correlationId: 'request-header' }));
  });

  it('strips CR/LF from inbound correlation id without crashing the request', () => {
    // Cannot exercise this end-to-end via supertest — superagent rejects outgoing headers with
    // CR/LF before they ever reach the server (Node's http client also enforces RFC 7230 §3.2.6).
    // Test the sanitisation helper directly: the contract is that the value returned to the
    // middleware is safe to pass to res.setHeader (which would otherwise throw ERR_INVALID_CHAR).
    expect(readCorrelationHeader('foo\r\nX-Injected: bar')).toBe('fooX-Injected: bar');
    expect(readCorrelationHeader('clean')).toBe('clean');
    expect(readCorrelationHeader('  trim-me  ')).toBe('trim-me');
    expect(readCorrelationHeader('null\x00byte')).toBe('nullbyte');
    expect(readCorrelationHeader('tab\there')).toBe('tabhere');
    expect(readCorrelationHeader('del\x7Fchar')).toBe('delchar');
    expect(readCorrelationHeader('\r\n   \r\n')).toBe('');
    expect(readCorrelationHeader(undefined)).toBe('');
    expect(readCorrelationHeader(['multi\r\nvalue', 'second'])).toBe('multivalue');
    expect(readCorrelationHeader([] as unknown as string[])).toBe('');
  });

  it('keeps create response successful when publishing fails', async () => {
    const model = buildCharacterModel();
    const publisher = { publish: vi.fn().mockRejectedValue(new Error('publish failed')) };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(model.create).mockResolvedValue(buildCharacter({ id: 'c2', roomId: 'r2' }));

    const app = createApp(model, { publisher });
    const response = await request(app)
      .post('/characters')
      .send({ roomId: 'r2', userId: 'u2', name: 'Mage', avatarId: 4, color: '#00aaff' });

    expect(response.status).toBe(201);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('support.failure', expect.objectContaining({
      subsystem: 'character',
      code: 'character_event_publish_failed',
      correlationId: expect.any(String),
      roomId: 'r2',
      actorId: 'c2',
      errorMessage: 'publish failed'
    }));
    errorSpy.mockRestore();
  });

  it('rejects create without color', async () => {
    const model = buildCharacterModel();
    const app = createApp(model);

    const response = await request(app).post('/characters').send({ roomId: 'r2', userId: 'u2', name: 'Mage', avatarId: 4 });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('color');
  });

  it('deletes unassociated character', async () => {
    const model = buildCharacterModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
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

    const app = createApp(model, { publisher });
    const response = await request(app).delete('/characters/c3');

    expect(response.status).toBe(204);
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'character_deleted',
        eventType: 'character_deleted',
        roomId: 'r3',
        event_body: { characterId: 'c3' },
        actorId: 'c3',
        character: { id: 'c3', name: 'Rogue', avatarId: 2, color: '#FFFFFF' }
      })
    );
  });

  it('deletes associated character', async () => {
    const model = buildCharacterModel();
    const now = new Date();
    vi.mocked(model.findByIdAndDelete).mockResolvedValue({
      id: 'c4',
      roomId: 'r4',
      userId: 'u4',
      name: 'Paladin',
      avatarId: 5,
      color: '#ABCDEF',
      level: 2,
      power: 3,
      class: '',
      race: '',
      gender: '',
      createdAt: now,
      updatedAt: now
    });

    const app = createApp(model);
    const response = await request(app).delete('/characters/c4');

    expect(response.status).toBe(204);
  });

  it('publishes update changes for changed fields only', async () => {
    const model = buildCharacterModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(model.findById).mockResolvedValue(buildCharacter({ id: 'c5', name: 'Hero', level: 1, color: '#AABBCC' }));
    vi.mocked(model.findByIdAndUpdate).mockResolvedValue(buildCharacter({ id: 'c5', name: 'Heroic', level: 2, color: '#AABBCC' }));

    const app = createApp(model, { publisher });
    const response = await request(app).patch('/characters/c5').send({ name: ' Heroic ', level: 2, color: '#aabbcc' });

    expect(response.status).toBe(200);
    expect(model.findById).toHaveBeenCalledWith('c5');
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'character_updated',
        character: { id: 'c5', name: 'Heroic', avatarId: 1, color: '#AABBCC' },
        changes: {
          name: { prev: 'Hero', next: 'Heroic' },
          level: { prev: 1, next: 2 }
        }
      })
    );
  });

  it('keeps update and delete responses successful when publishing fails', async () => {
    const model = buildCharacterModel();
    const publisher = { publish: vi.fn().mockRejectedValue(new Error('publish failed')) };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(model.findById).mockResolvedValue(buildCharacter({ id: 'c6', level: 1 }));
    vi.mocked(model.findByIdAndUpdate).mockResolvedValue(buildCharacter({ id: 'c6', level: 2 }));
    vi.mocked(model.findByIdAndDelete).mockResolvedValue(buildCharacter({ id: 'c6' }));

    const app = createApp(model, { publisher });

    await expect(request(app).patch('/characters/c6').send({ level: 2 })).resolves.toMatchObject({ status: 200 });
    await expect(request(app).delete('/characters/c6')).resolves.toMatchObject({ status: 204 });
    expect(publisher.publish).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });

  it('emits support.failure for unexpected errors without changing the response', async () => {
    const model = buildCharacterModel();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(model.find).mockReturnValue({
      sort: vi.fn().mockRejectedValue(new Error('database unavailable'))
    });

    const response = await request(createApp(model))
      .get('/characters')
      .set('x-correlation-id', 'corr-error')
      .query({ roomId: 'r1' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error', details: 'database unavailable' });
    expect(errorSpy).toHaveBeenCalledWith('support.failure', expect.objectContaining({
      subsystem: 'character',
      code: 'unexpected_error',
      correlationId: 'corr-error',
      httpStatus: 500,
      errorName: 'Error',
      errorMessage: 'database unavailable'
    }));
    errorSpy.mockRestore();
  });
});
