import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { userProfileContext } from '@/context/UserContext';
import i18n from '@/i18n';

const mockSearchParams = vi.hoisted(() => ({ current: {} as Record<string, string | undefined> }));
const mockCreate = vi.hoisted(() => vi.fn());
const mockJoin = vi.hoisted(() => vi.fn());

vi.mock('expo-router', async () => {
  const ReactRuntime = await import('react');
  return {
    Stack: {
      Screen: ({ options }: { options?: { title?: string } }) =>
        ReactRuntime.createElement('h1', { 'data-testid': 'screen-title' }, options?.title),
    },
    useLocalSearchParams: () => mockSearchParams.current,
    useRouter: () => ({ dismissTo: vi.fn() }),
  };
});

vi.mock('@/hooks/UseRoom', () => ({
  useRoomCreate: () => ({ create: mockCreate, isLoading: true, errorMessage: null }),
  useRoomJoin: () => ({ join: mockJoin, isLoading: true, errorMessage: null }),
}));

async function renderLoadingScreen(params: Record<string, string | undefined>) {
  mockSearchParams.current = params;
  const { default: MunchkinIndexView } = await import('../../../app/munchkin/index');

  await act(async () => {
    render(
      <userProfileContext.Provider
        value={{
          userProfile: { id: 'user-1', nickname: 'Player', avatar: 0 },
          setUserProfile: vi.fn(),
        }}
      >
        <MunchkinIndexView />
      </userProfileContext.Provider>
    );
  });

  return screen.getByTestId('screen-title').textContent;
}

describe('Munchkin room loading route', () => {
  beforeEach(async () => {
    mockCreate.mockReset().mockReturnValue(new Promise(() => {}));
    mockJoin.mockReset().mockReturnValue(new Promise(() => {}));
    await i18n.changeLanguage('en');
  });

  it('titles a Classic room creation as Classic', async () => {
    expect(await renderLoadingScreen({ roomTypeId: 'munchkin' })).toBe('Munch ⚔️ Classic');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ roomTypeId: 'munchkin' }));
  });

  it('titles a Second Edition room creation as Second Edition', async () => {
    expect(await renderLoadingScreen({ roomTypeId: 'munchkin-2e' })).toBe('Munch ⚔️ Second Edition');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ roomTypeId: 'munchkin-2e' }));
  });

  it('titles a creation without a room type as Classic, matching the created default', async () => {
    expect(await renderLoadingScreen({})).toBe('Munch ⚔️ Classic');
  });

  it('uses a neutral title while joining a room of unknown edition', async () => {
    expect(await renderLoadingScreen({ roomId: 'ROOM1' })).toBe('Munch ⚔️');
    expect(mockJoin).toHaveBeenCalledWith('ROOM1', expect.any(Object));
  });

  it('uses the room type hint when joining with one', async () => {
    expect(await renderLoadingScreen({ roomId: 'ROOM1', roomTypeId: 'munchkin-2e' })).toBe('Munch ⚔️ Second Edition');
  });

  it('localizes the Second Edition title', async () => {
    await i18n.changeLanguage('de');
    const title = await renderLoadingScreen({ roomTypeId: 'munchkin-2e' });
    expect(title).toBe(`Munch ⚔️ ${i18n.t('rooms.secondEdition')}`);
  });
});
