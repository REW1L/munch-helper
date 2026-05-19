import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp, type BattleLike, type BattleModelLike } from './app';

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
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'battle_started', battleId: 'battle-1' }));
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
    vi.mocked(model.findOne).mockRejectedValue(new Error('database unavailable'));

    const response = await request(createApp(model)).get('/battles').query({ roomId: 'room-1' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: 'Unexpected error' });
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
    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'battle_updated', battleId: 'battle-1' }));
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

  it.each(['concluded', 'discarded'] as const)('returns 409 for patching a %s battle', async (status) => {
    const model = buildBattleModel();
    vi.mocked(model.findById).mockResolvedValue(buildBattle({ status }));

    const response = await request(createApp(model)).patch('/battles/battle-1').send({ name: 'Updated' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: 'Battle is not active' });
    expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
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
