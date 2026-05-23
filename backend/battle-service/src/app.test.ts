import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp, type BattleLike, type BattleModelLike } from './app';
import { FanOutBattleEventPublisher } from './publisher';

function buildBattle(overrides: Partial<BattleLike> = {}): BattleLike {
  const now = new Date('2026-05-17T12:00:00.000Z');
  return {
    id: 'battle-1',
    roomId: 'room-1',
    name: 'Battle 1',
    status: 'active',
    playerSide: { characterIds: [], bonuses: [] },
    monsterSide: { monsters: [], bonuses: [] },
    result: null,
    concludedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function buildBattleModel(): BattleModelLike {
  return {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findActiveByIdAndConclude: vi.fn(),
    findActiveByIdAndDiscard: vi.fn(),
    create: vi.fn()
  };
}

describe('battle-service app', () => {
  it('creates an active battle when none exists', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    const battle = buildBattle({ name: 'Dungeon Door' });
    vi.mocked(model.findOne).mockResolvedValue(null);
    vi.mocked(model.create).mockResolvedValue(battle);

    const response = await request(createApp(model, { publisher }))
      .post('/battles')
      .send({ roomId: 'room-1', name: ' Dungeon Door ' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 'battle-1',
      roomId: 'room-1',
      name: 'Dungeon Door',
      status: 'active',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null
    });
    expect(response.body._id).toBeUndefined();
    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ roomId: 'room-1', name: 'Dungeon Door' }));
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({
      event: 'battle_started',
      eventType: 'battle_started',
      battleId: 'battle-1',
      actorId: 'battle-1',
      event_body: { battleId: 'battle-1' },
      battle: expect.objectContaining({
        id: 'battle-1',
        name: 'Dungeon Door',
        status: 'active',
        result: null
      })
    }));
  });

  it('uses inbound correlation id on response and published event', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(model.findOne).mockResolvedValue(null);
    vi.mocked(model.create).mockResolvedValue(buildBattle());

    const response = await request(createApp(model, { publisher }))
      .post('/battles')
      .set('x-correlation-id', 'corr-header')
      .send({ roomId: 'room-1', name: 'Battle' });

    expect(response.status).toBe(201);
    expect(response.headers['x-correlation-id']).toBe('corr-header');
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ correlationId: 'corr-header' }));
  });

  it('falls back to x-request-id for published correlation id', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(model.findOne).mockResolvedValue(null);
    vi.mocked(model.create).mockResolvedValue(buildBattle());

    const response = await request(createApp(model, { publisher }))
      .post('/battles')
      .set('x-request-id', 'request-header')
      .send({ roomId: 'room-1', name: 'Battle' });

    expect(response.headers['x-correlation-id']).toBe('request-header');
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ correlationId: 'request-header' }));
  });

  it('swallows a publisher failure on POST without failing the request', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockRejectedValue(new Error('publish down')) };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(model.findOne).mockResolvedValue(null);
    vi.mocked(model.create).mockResolvedValue(buildBattle());

    const response = await request(createApp(model, { publisher }))
      .post('/battles')
      .send({ roomId: 'room-1', name: 'Battle' });

    expect(response.status).toBe(201);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('support.failure', expect.objectContaining({
      subsystem: 'battle',
      code: 'battle_event_publish_failed',
      correlationId: expect.any(String),
      roomId: 'room-1',
      actorId: 'battle-1',
      errorMessage: 'publish down'
    }));
    errorSpy.mockRestore();
  });

  it('rejects a second active battle', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findOne).mockResolvedValue(buildBattle({ id: 'existing-battle' }));

    const response = await request(createApp(model)).post('/battles').send({ roomId: 'room-1', name: 'Another Battle' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      message: 'A battle is already active for this room',
      activeBattleId: 'existing-battle'
    });
    expect(model.create).not.toHaveBeenCalled();
  });

  it('maps duplicate-key races to 409', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildBattle({ id: 'race-winner' }));
    vi.mocked(model.create).mockRejectedValue({ code: 11000 });

    const response = await request(createApp(model)).post('/battles').send({ roomId: 'room-1', name: 'Race' });

    expect(response.status).toBe(409);
    expect(response.body.activeBattleId).toBe('race-winner');
  });

  it('retries the create when the duplicate-key winner is already gone', async () => {
    const model = buildBattleModel();
    const battle = buildBattle({ id: 'retried-battle' });
    vi.mocked(model.findOne).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    vi.mocked(model.create).mockRejectedValueOnce({ code: 11000 }).mockResolvedValueOnce(battle);

    const response = await request(createApp(model)).post('/battles').send({ roomId: 'room-1', name: 'Retry' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('retried-battle');
    expect(model.create).toHaveBeenCalledTimes(2);
  });

  it('maps wrapped duplicate-key errors to 409 instead of 502', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildBattle({ id: 'race-winner' }));
    vi.mocked(model.create).mockRejectedValue({ writeErrors: [{ code: 11000 }] });

    const response = await request(createApp(model)).post('/battles').send({ roomId: 'room-1', name: 'Race' });

    expect(response.status).toBe(409);
    expect(response.body.activeBattleId).toBe('race-winner');
  });

  it('returns 400 for a malformed JSON body', async () => {
    const model = buildBattleModel();

    const response = await request(createApp(model))
      .post('/battles')
      .set('Content-Type', 'application/json')
      .send('{"roomId": "room-1"');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Invalid JSON body' });
    expect(model.create).not.toHaveBeenCalled();
  });

  it('resolves to null for a non-active status query without querying the model', async () => {
    const model = buildBattleModel();

    const response = await request(createApp(model)).get('/battles').query({ roomId: 'room-1', status: 'concluded' });

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
    expect(model.findOne).not.toHaveBeenCalled();
  });

  it('gets an active battle by room', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findOne).mockResolvedValue(buildBattle());

    const response = await request(createApp(model)).get('/battles').query({ roomId: 'room-1', status: 'active' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 'battle-1', roomId: 'room-1', status: 'active' });
  });

  it('returns JSON null when no active battle exists', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findOne).mockResolvedValue(null);

    const response = await request(createApp(model)).get('/battles').query({ roomId: 'room-2', status: 'active' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toBeNull();
  });

  it('validates missing roomId and name', async () => {
    const model = buildBattleModel();
    const app = createApp(model);

    const missingRoom = await request(app).post('/battles').send({ name: 'Battle' });
    const missingName = await request(app).post('/battles').send({ roomId: 'room-1', name: ' ' });
    const missingQuery = await request(app).get('/battles');

    expect(missingRoom.status).toBe(400);
    expect(missingName.status).toBe(400);
    expect(missingQuery.status).toBe(400);
  });

  it('returns 502 for unexpected errors', async () => {
    const model = buildBattleModel();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(model.findOne).mockRejectedValue(new Error('database unavailable'));

    const response = await request(createApp(model))
      .get('/battles')
      .set('x-correlation-id', 'corr-error')
      .query({ roomId: 'room-1' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: 'Unexpected error' });
    expect(errorSpy).toHaveBeenCalledWith('support.failure', expect.objectContaining({
      subsystem: 'battle',
      code: 'unexpected_error',
      correlationId: 'corr-error',
      httpStatus: 502,
      errorName: 'Error',
      errorMessage: 'database unavailable'
    }));
    errorSpy.mockRestore();
  });

  it('patches an active battle with full side replacements and trimmed name', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    const existing = buildBattle({
      playerSide: { characterIds: ['old-character'], bonuses: [{ id: 'old-bonus', value: 1 }] },
      monsterSide: { monsters: [{ id: 'old-monster', name: 'Old', level: 1 }], bonuses: [] }
    });
    const updated = buildBattle({
      name: 'Updated Battle',
      playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [{ id: 'bonus-1', value: 3 }] },
      monsterSide: {
        monsters: [{ id: 'monster-1', name: 'Goblin', level: 6 }],
        bonuses: [{ id: 'monster-bonus-1', value: -1 }]
      }
    });

    vi.mocked(model.findById).mockResolvedValue(existing);
    vi.mocked(model.findByIdAndUpdate).mockResolvedValue(updated);

    const response = await request(createApp(model, { publisher }))
      .patch('/battles/battle-1')
      .send({
        name: ' Updated Battle ',
        status: 'concluded',
        roomId: 'other-room',
        playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [{ id: 'bonus-1', value: 3 }] },
        monsterSide: {
          monsters: [{ id: 'monster-1', name: ' Goblin ', level: 6 }],
          bonuses: [{ id: 'monster-bonus-1', value: -1 }]
        }
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 'battle-1',
      name: 'Updated Battle',
      playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [{ id: 'bonus-1', value: 3 }] },
      monsterSide: {
        monsters: [{ id: 'monster-1', name: 'Goblin', level: 6 }],
        bonuses: [{ id: 'monster-bonus-1', value: -1 }]
      }
    });
    expect(response.body._id).toBeUndefined();
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      'battle-1',
      {
        name: 'Updated Battle',
        playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [{ id: 'bonus-1', value: 3 }] },
        monsterSide: {
          monsters: [{ id: 'monster-1', name: 'Goblin', level: 6 }],
          bonuses: [{ id: 'monster-bonus-1', value: -1 }]
        }
      },
      { new: true, runValidators: true }
    );
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({
      event: 'battle_updated',
      eventType: 'battle_updated',
      battleId: 'battle-1',
      event_body: { battleId: 'battle-1' },
      battle: expect.objectContaining({
        name: 'Updated Battle',
        status: 'active',
        playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [{ id: 'bonus-1', value: 3 }] },
        monsterSide: {
          monsters: [{ id: 'monster-1', name: 'Goblin', level: 6 }],
          bonuses: [{ id: 'monster-bonus-1', value: -1 }]
        }
      })
    }));
  });

  it('publishes battle_updated to the notifications fan-out leg only', async () => {
    const model = buildBattleModel();
    const notifications = { publish: vi.fn().mockResolvedValue(undefined) };
    const log = { publish: vi.fn().mockResolvedValue(undefined) };
    const publisher = new FanOutBattleEventPublisher([
      { target: 'notifications', publisher: notifications },
      { target: 'log', publisher: log }
    ]);
    vi.mocked(model.findById).mockResolvedValue(buildBattle());
    vi.mocked(model.findByIdAndUpdate).mockResolvedValue(buildBattle({ name: 'Updated' }));

    const response = await request(createApp(model, { publisher })).patch('/battles/battle-1').send({ name: 'Updated' });

    expect(response.status).toBe(200);
    expect(notifications.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'battle_updated' }));
    expect(log.publish).not.toHaveBeenCalled();
  });

  it.each([
    ['no valid fields', { status: 'active' }],
    ['empty name', { name: ' ' }],
    ['bad bonus value', { playerSide: { characterIds: [], bonuses: [{ id: 'bonus-1', value: 1.5 }] } }],
    ['duplicate bonus ids', { playerSide: { characterIds: [], bonuses: [{ id: 'bonus-1', value: 1 }, { id: 'bonus-1', value: 2 }] } }],
    ['bad monster level', { monsterSide: { monsters: [{ id: 'monster-1', name: 'Orc', level: -1 }], bonuses: [] } }],
    ['duplicate monster ids', { monsterSide: { monsters: [{ id: 'monster-1', name: 'Orc', level: 1 }, { id: 'monster-1', name: 'Troll', level: 2 }], bonuses: [] } }],
    ['empty character id', { playerSide: { characterIds: [' '], bonuses: [] } }],
    ['playerSide missing bonuses', { playerSide: { characterIds: ['character-1'] } }],
    ['monsterSide missing bonuses', { monsterSide: { monsters: [] } }],
    ['duplicate character ids', { playerSide: { characterIds: ['character-1', 'character-1'], bonuses: [] } }]
  ])('returns 400 for invalid patch payload: %s', async (_label, payload) => {
    const model = buildBattleModel();

    const response = await request(createApp(model)).patch('/battles/battle-1').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(expect.any(String));
    expect(model.findById).not.toHaveBeenCalled();
    expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('returns the side-level error message when bonuses is omitted', async () => {
    const model = buildBattleModel();
    const app = createApp(model);

    const playerResponse = await request(app)
      .patch('/battles/battle-1')
      .send({ playerSide: { characterIds: ['character-1'] } });
    const monsterResponse = await request(app)
      .patch('/battles/battle-1')
      .send({ monsterSide: { monsters: [] } });

    expect(playerResponse.status).toBe(400);
    expect(playerResponse.body).toEqual({ message: 'Field playerSide must include characterIds and bonuses' });
    expect(monsterResponse.status).toBe(400);
    expect(monsterResponse.body).toEqual({ message: 'Field monsterSide must include monsters and bonuses' });
  });

  it('rejects duplicate characterIds with a duplicate-specific message', async () => {
    const model = buildBattleModel();

    const response = await request(createApp(model))
      .patch('/battles/battle-1')
      .send({ playerSide: { characterIds: ['character-1', 'character-1'], bonuses: [] } });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Field playerSide.characterIds must not contain duplicates' });
  });

  it('returns 404 when patch target is missing or malformed', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findById).mockResolvedValueOnce(null).mockRejectedValueOnce(Object.assign(new Error('bad id'), { name: 'CastError' }));
    const app = createApp(model);

    const missing = await request(app).patch('/battles/missing').send({ name: 'Battle' });
    const castError = await request(app).patch('/battles/bad-id').send({ name: 'Battle' });

    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'Battle not found' });
    expect(castError.status).toBe(404);
    expect(castError.body).toEqual({ message: 'Battle not found' });
  });

  it.each(['concluded', 'discarded'] as const)('returns 409 for patching a %s battle and does not publish', async (status) => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn() };
    vi.mocked(model.findById).mockResolvedValue(buildBattle({ status }));

    const response = await request(createApp(model, { publisher })).patch('/battles/battle-1').send({ name: 'Updated' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: 'Battle is not active' });
    expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('returns 502 for unexpected patch errors', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findById).mockResolvedValue(buildBattle());
    vi.mocked(model.findByIdAndUpdate).mockRejectedValue(new Error('database unavailable'));

    const response = await request(createApp(model)).patch('/battles/battle-1').send({ name: 'Updated' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: 'Unexpected error' });
  });

  it('keeps successful patches successful when the publisher fails', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockRejectedValue(new Error('publish unavailable')) };
    vi.mocked(model.findById).mockResolvedValue(buildBattle());
    vi.mocked(model.findByIdAndUpdate).mockResolvedValue(buildBattle({ name: 'Updated' }));

    const response = await request(createApp(model, { publisher })).patch('/battles/battle-1').send({ name: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated');
  });

  it('concludes an active battle with an explicit result and publishes once', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    const concluded = buildBattle({
      status: 'concluded',
      result: 'players_win',
      concludedAt: new Date('2026-05-17T12:05:00.000Z'),
      name: 'Dungeon Door',
      playerSide: { characterIds: ['character-1'], bonuses: [{ id: 'bonus-1', value: 2 }] },
      monsterSide: { monsters: [{ id: 'monster-1', name: 'Fungeater', level: 5 }], bonuses: [] }
    });
    vi.mocked(model.findActiveByIdAndConclude).mockResolvedValue(concluded);

    const response = await request(createApp(model, { publisher }))
      .post('/battles/battle-1/conclude')
      .send({ result: 'players_win', name: 'Ignored Name', status: 'discarded' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 'battle-1',
      name: 'Dungeon Door',
      status: 'concluded',
      result: 'players_win',
      playerSide: { characterIds: ['character-1'], bonuses: [{ id: 'bonus-1', value: 2 }] },
      monsterSide: { monsters: [{ id: 'monster-1', name: 'Fungeater', level: 5 }], bonuses: [] }
    });
    expect(response.body.concludedAt).toBeTruthy();
    expect(model.findActiveByIdAndConclude).toHaveBeenCalledWith('battle-1', 'players_win', expect.any(Date));
    expect(model.findById).not.toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({
      event: 'battle_concluded',
      eventType: 'battle_concluded',
      roomId: 'room-1',
      battleId: 'battle-1',
      event_body: { battleId: 'battle-1' },
      emittedAt: expect.any(String),
      occurredAt: expect.any(String),
      battle: expect.objectContaining({
        name: 'Dungeon Door',
        status: 'concluded',
        result: 'players_win',
        playerSide: { characterIds: ['character-1'], bonuses: [{ id: 'bonus-1', value: 2 }] },
        monsterSide: { monsters: [{ id: 'monster-1', name: 'Fungeater', level: 5 }], bonuses: [] }
      })
    }));
  });

  it.each([
    ['empty body', undefined],
    ['missing result', { name: 'Battle' }],
    ['unknown result', { result: 'maybe' }],
    ['null result', { result: null }]
  ])('returns 400 for invalid conclude payload: %s', async (_label, payload) => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn() };
    const testRequest = request(createApp(model, { publisher })).post('/battles/battle-1/conclude');
    const response = payload === undefined ? await testRequest.send() : await testRequest.send(payload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Field result is required and must be "players_win" or "monster_wins"' });
    expect(model.findActiveByIdAndConclude).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('returns 404 when conclude target is missing or malformed', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findActiveByIdAndConclude)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(Object.assign(new Error('bad id'), { name: 'CastError' }));
    vi.mocked(model.findById).mockResolvedValueOnce(null);
    const app = createApp(model);

    const missing = await request(app).post('/battles/missing/conclude').send({ result: 'players_win' });
    const castError = await request(app).post('/battles/bad-id/conclude').send({ result: 'players_win' });

    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'Battle not found' });
    expect(castError.status).toBe(404);
    expect(castError.body).toEqual({ message: 'Battle not found' });
  });

  it.each(['concluded', 'discarded'] as const)('returns 409 for concluding a %s battle and does not publish', async (status) => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn() };
    vi.mocked(model.findActiveByIdAndConclude).mockResolvedValue(null);
    vi.mocked(model.findById).mockResolvedValue(buildBattle({ status }));

    const response = await request(createApp(model, { publisher }))
      .post('/battles/battle-1/conclude')
      .send({ result: 'monster_wins' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: 'Battle is not active' });
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('maps conclude double-write races to one success and one 409', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(model.findActiveByIdAndConclude)
      .mockResolvedValueOnce(buildBattle({ status: 'concluded', result: 'players_win', concludedAt: new Date() }))
      .mockResolvedValueOnce(null);
    vi.mocked(model.findById).mockResolvedValue(buildBattle({ status: 'concluded', result: 'players_win', concludedAt: new Date() }));
    const app = createApp(model, { publisher });

    const first = await request(app).post('/battles/battle-1/conclude').send({ result: 'players_win' });
    const second = await request(app).post('/battles/battle-1/conclude').send({ result: 'players_win' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it('returns 502 for unexpected conclude errors', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findActiveByIdAndConclude).mockRejectedValue(new Error('database unavailable'));

    const response = await request(createApp(model)).post('/battles/battle-1/conclude').send({ result: 'players_win' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: 'Unexpected error' });
  });

  it('keeps successful concludes successful when the publisher fails', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockRejectedValue(new Error('publish unavailable')) };
    vi.mocked(model.findActiveByIdAndConclude).mockResolvedValue(
      buildBattle({ status: 'concluded', result: 'monster_wins', concludedAt: new Date() })
    );

    const response = await request(createApp(model, { publisher }))
      .post('/battles/battle-1/conclude')
      .send({ result: 'monster_wins' });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe('monster_wins');
  });

  it('discards an active battle by soft-deleting status and publishes once', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    const discarded = buildBattle({
      status: 'discarded',
      name: 'Dungeon Door',
      playerSide: { characterIds: ['character-1'], bonuses: [{ id: 'bonus-1', value: 2 }] },
      monsterSide: { monsters: [{ id: 'monster-1', name: 'Fungeater', level: 5 }], bonuses: [] },
      result: null,
      concludedAt: null
    });
    vi.mocked(model.findActiveByIdAndDiscard).mockResolvedValue(discarded);

    const response = await request(createApp(model, { publisher }))
      .delete('/battles/battle-1')
      .send({ result: 'players_win', name: 'Ignored Name' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 'battle-1',
      name: 'Dungeon Door',
      status: 'discarded',
      result: null,
      concludedAt: null,
      playerSide: { characterIds: ['character-1'], bonuses: [{ id: 'bonus-1', value: 2 }] },
      monsterSide: { monsters: [{ id: 'monster-1', name: 'Fungeater', level: 5 }], bonuses: [] }
    });
    expect(model.findActiveByIdAndDiscard).toHaveBeenCalledWith('battle-1');
    expect(model.findById).not.toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({
      event: 'battle_discarded',
      eventType: 'battle_discarded',
      roomId: 'room-1',
      battleId: 'battle-1',
      event_body: { battleId: 'battle-1' },
      emittedAt: expect.any(String),
      battle: expect.objectContaining({
        name: 'Dungeon Door',
        status: 'discarded',
        result: null,
        playerSide: { characterIds: ['character-1'], bonuses: [{ id: 'bonus-1', value: 2 }] },
        monsterSide: { monsters: [{ id: 'monster-1', name: 'Fungeater', level: 5 }], bonuses: [] }
      })
    }));
  });

  it('returns 404 when discard target is missing or malformed', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findActiveByIdAndDiscard)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(Object.assign(new Error('bad id'), { name: 'CastError' }));
    vi.mocked(model.findById).mockResolvedValueOnce(null);
    const app = createApp(model);

    const missing = await request(app).delete('/battles/missing');
    const castError = await request(app).delete('/battles/bad-id');

    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'Battle not found' });
    expect(castError.status).toBe(404);
    expect(castError.body).toEqual({ message: 'Battle not found' });
  });

  it.each(['concluded', 'discarded'] as const)('returns 409 for discarding a %s battle and does not publish', async (status) => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn() };
    vi.mocked(model.findActiveByIdAndDiscard).mockResolvedValue(null);
    vi.mocked(model.findById).mockResolvedValue(buildBattle({ status }));

    const response = await request(createApp(model, { publisher })).delete('/battles/battle-1');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: 'Battle is not active' });
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('maps discard double-write races to one success and one 409', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(model.findActiveByIdAndDiscard)
      .mockResolvedValueOnce(buildBattle({ status: 'discarded' }))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    vi.mocked(model.findById)
      .mockResolvedValueOnce(buildBattle({ status: 'discarded' }))
      .mockResolvedValueOnce(buildBattle({ status: 'concluded', result: 'players_win', concludedAt: new Date() }));
    const app = createApp(model, { publisher });

    const first = await request(app).delete('/battles/battle-1');
    const second = await request(app).delete('/battles/battle-1');
    const concludeRace = await request(app).delete('/battles/battle-1');

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(concludeRace.status).toBe(409);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it('returns 502 for unexpected discard errors', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findActiveByIdAndDiscard).mockRejectedValue(new Error('database unavailable'));

    const response = await request(createApp(model)).delete('/battles/battle-1');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: 'Unexpected error' });
  });

  it('keeps successful discards successful when the publisher fails', async () => {
    const model = buildBattleModel();
    const publisher = { publish: vi.fn().mockRejectedValue(new Error('publish unavailable')) };
    vi.mocked(model.findActiveByIdAndDiscard).mockResolvedValue(buildBattle({ status: 'discarded' }));

    const response = await request(createApp(model, { publisher })).delete('/battles/battle-1');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('discarded');
  });

  it('strips the configured route prefix', async () => {
    const model = buildBattleModel();
    vi.mocked(model.findOne).mockResolvedValue(buildBattle());

    const response = await request(createApp(model, { routePrefix: '/prod' }))
      .get('/prod/battles')
      .query({ roomId: 'room-1' });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('battle-1');
  });
});
