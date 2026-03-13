import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateApp, mockCharacter } = vi.hoisted(() => ({
  mockCreateApp: vi.fn(() => 'character-app'),
  mockCharacter: {
    find: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock('./app', () => ({
  createApp: mockCreateApp,
}));

vi.mock('./models/Character', () => ({
  Character: mockCharacter,
}));

import { buildCharacterApp, createCharacterModel } from './service';

describe('character-service service', () => {
  beforeEach(() => {
    mockCreateApp.mockClear();
    mockCharacter.find.mockReset();
    mockCharacter.create.mockReset();
    mockCharacter.findByIdAndUpdate.mockReset();
    mockCharacter.findByIdAndDelete.mockReset();
  });

  it('maps sorted character reads', async () => {
    const createdAt = new Date('2026-03-13T00:00:00.000Z');
    const updatedAt = new Date('2026-03-13T01:00:00.000Z');
    const sort = vi.fn().mockResolvedValue([
      {
        id: 'char-1',
        roomId: 'room-1',
        userId: 'user-1',
        name: 'Mage',
        avatarId: 2,
        color: '#123456',
        level: 3,
        power: 5,
        class: ['Wizard'],
        race: ['Elf'],
        gender: ['female'],
        createdAt,
        updatedAt,
      },
    ]);
    mockCharacter.find.mockReturnValueOnce({ sort });

    const model = createCharacterModel();
    const result = await model.find({ roomId: 'room-1' }).sort({ createdAt: 1 });

    expect(mockCharacter.find).toHaveBeenCalledWith({ roomId: 'room-1' });
    expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(result[0]).toMatchObject({ id: 'char-1', name: 'Mage', createdAt, updatedAt });
  });

  it('maps created, updated, and deleted characters and preserves missing results', async () => {
    const createdAt = new Date('2026-03-13T00:00:00.000Z');
    const updatedAt = new Date('2026-03-13T01:00:00.000Z');
    const mappedCharacter = {
      id: 'char-1',
      roomId: 'room-1',
      userId: 'user-1',
      name: 'Mage',
      avatarId: 2,
      color: '#123456',
      level: 3,
      power: 5,
      class: ['Wizard'],
      race: ['Elf'],
      gender: ['female'],
      createdAt,
      updatedAt,
    };
    mockCharacter.create.mockResolvedValueOnce(mappedCharacter);
    mockCharacter.findByIdAndUpdate.mockResolvedValueOnce(mappedCharacter).mockResolvedValueOnce(null);
    mockCharacter.findByIdAndDelete.mockResolvedValueOnce(mappedCharacter).mockResolvedValueOnce(null);

    const model = createCharacterModel();

    await expect(model.create({ roomId: 'room-1', name: 'Mage', avatarId: 2, color: '#123456' } as never)).resolves.toEqual(mappedCharacter);
    await expect(model.findByIdAndUpdate('char-1', { name: 'Mage+' }, { new: true, runValidators: true } as never)).resolves.toEqual(mappedCharacter);
    await expect(model.findByIdAndUpdate('char-2', {}, { new: true, runValidators: true } as never)).resolves.toBeNull();
    await expect(model.findByIdAndDelete('char-1')).resolves.toEqual(mappedCharacter);
    await expect(model.findByIdAndDelete('char-2')).resolves.toBeNull();
  });

  it('builds the express app with route prefix and publisher', () => {
    const publisher = { publish: vi.fn() };
    const app = buildCharacterApp({ routePrefix: '/prod', publisher });

    expect(app).toBe('character-app');
    expect(mockCreateApp).toHaveBeenCalledWith(
      expect.objectContaining({
        find: expect.any(Function),
        create: expect.any(Function),
        findByIdAndUpdate: expect.any(Function),
        findByIdAndDelete: expect.any(Function),
      }),
      { routePrefix: '/prod', publisher }
    );
  });
});