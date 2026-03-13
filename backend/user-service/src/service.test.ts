import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateApp, mockUser } = vi.hoisted(() => ({
  mockCreateApp: vi.fn(() => 'user-app'),
  mockUser: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('./app', () => ({
  createApp: mockCreateApp,
}));

vi.mock('./models/User', () => ({
  User: mockUser,
}));

import { buildUserApp, createUserModel } from './service';

describe('user-service service', () => {
  beforeEach(() => {
    mockCreateApp.mockClear();
    mockUser.create.mockReset();
    mockUser.findById.mockReset();
    mockUser.findByIdAndUpdate.mockReset();
  });

  it('maps created users into app-facing shape', async () => {
    const createdAt = new Date('2026-03-13T00:00:00.000Z');
    const updatedAt = new Date('2026-03-13T01:00:00.000Z');
    mockUser.create.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Alice',
      avatarId: 2,
      createdAt,
      updatedAt,
    });

    const model = createUserModel();
    const result = await model.create({ name: 'Alice', avatarId: 2 });

    expect(mockUser.create).toHaveBeenCalledWith({ name: 'Alice', avatarId: 2 });
    expect(result).toEqual({ id: 'user-1', name: 'Alice', avatarId: 2, createdAt, updatedAt });
  });

  it('returns null when a user is not found during reads or updates', async () => {
    mockUser.findById.mockResolvedValueOnce(null);
    mockUser.findByIdAndUpdate.mockResolvedValueOnce(null);

    const model = createUserModel();

    await expect(model.findById('missing')).resolves.toBeNull();
    await expect(model.findByIdAndUpdate('missing', { name: 'X' }, { new: true, runValidators: true })).resolves.toBeNull();
  });

  it('maps fetched and updated users into app-facing shape', async () => {
    const createdAt = new Date('2026-03-13T00:00:00.000Z');
    const updatedAt = new Date('2026-03-13T01:00:00.000Z');
    const mappedUser = {
      id: 'user-2',
      name: 'Bob',
      avatarId: 4,
      createdAt,
      updatedAt,
    };
    mockUser.findById.mockResolvedValueOnce(mappedUser);
    mockUser.findByIdAndUpdate.mockResolvedValueOnce(mappedUser);

    const model = createUserModel();

    await expect(model.findById('user-2')).resolves.toEqual(mappedUser);
    await expect(model.findByIdAndUpdate('user-2', { avatarId: 4 }, { new: true, runValidators: true })).resolves.toEqual(mappedUser);
  });

  it('builds the express app with the created model and route prefix', () => {
    const app = buildUserApp({ routePrefix: '/prod' });

    expect(app).toBe('user-app');
    expect(mockCreateApp).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.any(Function),
        findById: expect.any(Function),
        findByIdAndUpdate: expect.any(Function),
      }),
      { routePrefix: '/prod' }
    );
  });
});