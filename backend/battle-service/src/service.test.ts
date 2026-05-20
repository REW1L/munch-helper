import { describe, expect, it, vi } from 'vitest';
import { createBattleModel } from './service';

vi.mock('./models/Battle', () => ({
  Battle: {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn()
  }
}));

describe('battle-service model wrapper', () => {
  it('maps mongoose documents to battle-like objects', async () => {
    const { Battle } = await import('./models/Battle.js');
    const model = createBattleModel();
    const now = new Date();
    const document = {
      id: 'battle-1',
      roomId: 'room-1',
      name: 'Battle',
      status: 'active',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null,
      concludedAt: null,
      createdAt: now,
      updatedAt: now
    };

    vi.mocked(Battle.findOne as any).mockResolvedValue(document);
    vi.mocked(Battle.findById as any).mockResolvedValue(document);
    vi.mocked(Battle.findByIdAndUpdate as any).mockResolvedValue(document);
    vi.mocked(Battle.findOneAndUpdate as any).mockResolvedValue(document);
    vi.mocked(Battle.create as any).mockResolvedValue(document);

    await expect(model.findOne({ roomId: 'room-1', status: 'active' })).resolves.toMatchObject({ id: 'battle-1' });
    await expect(model.findById('battle-1')).resolves.toMatchObject({ id: 'battle-1' });
    await expect(model.create({
      roomId: 'room-1',
      name: 'Battle',
      status: 'active',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null,
      concludedAt: null
    })).resolves.toMatchObject({ id: 'battle-1' });
    await expect(model.findByIdAndUpdate('battle-1', { name: 'Updated' }, {
      new: true,
      runValidators: true
    })).resolves.toMatchObject({ id: 'battle-1' });
    await expect(model.findActiveByIdAndConclude('battle-1', 'players_win', now)).resolves.toMatchObject({
      id: 'battle-1'
    });
    expect(Battle.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'battle-1', status: 'active' },
      { $set: { status: 'concluded', result: 'players_win', concludedAt: now } },
      { new: true, runValidators: true }
    );
    await expect(model.findActiveByIdAndDiscard('battle-1')).resolves.toMatchObject({
      id: 'battle-1'
    });
    expect(Battle.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'battle-1', status: 'active' },
      { $set: { status: 'discarded' } },
      { new: true, runValidators: true }
    );
  });
});
