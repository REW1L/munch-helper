import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { userProfileContext } from '@/context/UserContext';
import i18n from '@/i18n';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  router: {
    navigate: mockNavigate,
  },
}));

vi.mock('react-native-safe-area-context', async () => {
  const ReactRuntime = await import('react');

  return {
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      ReactRuntime.createElement(ReactRuntime.Fragment, null, children),
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
      ReactRuntime.createElement('div', props, children),
  };
});

vi.mock('expo-image', async () => {
  const ReactRuntime = await import('react');

  return {
    Image: (props: Record<string, unknown>) => ReactRuntime.createElement('img', props),
  };
});

vi.mock('@/constants/avatars', () => ({
  default: ['avatar-1'],
}));

vi.mock('../../app/main/modal-change-user', async () => {
  const ReactRuntime = await import('react');
  return {
    default: ({ visible }: { visible: boolean }) =>
      visible ? ReactRuntime.createElement('div', { 'data-testid': 'change-user-modal' }) : null,
  };
});

vi.mock('../../app/main/modal-room-create', async () => {
  const ReactRuntime = await import('react');
  return {
    default: ({ visible, onConfirm }: { visible: boolean; onConfirm: () => void }) =>
      visible ? ReactRuntime.createElement('button', { 'data-testid': 'create-room-modal', onClick: onConfirm }) : null,
  };
});

vi.mock('../../app/main/modal-room-join', async () => {
  const ReactRuntime = await import('react');
  return {
    default: ({ visible }: { visible: boolean }) =>
      visible ? ReactRuntime.createElement('div', { 'data-testid': 'join-room-modal' }) : null,
  };
});

describe('Rooms route', () => {
  beforeEach(async () => {
    mockNavigate.mockReset();
    await i18n.changeLanguage('en');
  });

  it('opens Munchkin Classic rules without opening room actions', async () => {
    const { default: RoomsPage } = await import('../../app/rooms');

    await act(async () => {
      render(
        <userProfileContext.Provider
          value={{
            userProfile: { id: 'user-1', nickname: 'Player', avatar: 0 },
            setUserProfile: vi.fn(),
          }}
        >
          <RoomsPage />
        </userProfileContext.Provider>
      );
    });

    expect(screen.getByTestId('create-room-button')).toBeTruthy();
    expect(screen.getAllByTestId('screenshot-open-room-join').length).toBeGreaterThan(0);

    const rulesAction = screen.getByTestId('open-munchkin-rules');
    expect(rulesAction.textContent).toBe('Rules');

    await act(async () => {
      fireEvent.click(rulesAction);
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/munchkin/rules');
    expect(screen.queryByTestId('create-room-modal')).toBeNull();
    expect(screen.queryByTestId('join-room-modal')).toBeNull();
  });

  it('selects Second Edition for room creation and opens its rules guide', async () => {
    const { default: RoomsPage } = await import('../../app/rooms');
    await act(async () => {
      render(
        <userProfileContext.Provider value={{ userProfile: { id: 'user-1', nickname: 'Player', avatar: 0 }, setUserProfile: vi.fn() }}>
          <RoomsPage />
        </userProfileContext.Provider>
      );
    });
    await act(async () => { fireEvent.click(screen.getByTestId('create-2e-room-button')); });
    await act(async () => { fireEvent.click(screen.getByTestId('create-room-modal')); });
    expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/munchkin', params: { roomTypeId: 'munchkin-2e' } });
    await act(async () => { fireEvent.click(screen.getByTestId('open-2e-rules')); });
    expect(mockNavigate).toHaveBeenLastCalledWith('/munchkin/rules?edition=2e');
  });

  it('keeps long localized actions accessible at the smallest viewport', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    await i18n.changeLanguage('uk');
    const { default: RoomsPage } = await import('../../app/rooms');

    await act(async () => {
      render(
        <userProfileContext.Provider
          value={{
            userProfile: { id: 'user-1', nickname: 'Player', avatar: 0 },
            setUserProfile: vi.fn(),
          }}
        >
          <RoomsPage />
        </userProfileContext.Provider>
      );
    });

    expect(screen.getAllByText('Приєднатися')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'правила' })).toHaveLength(2);
    expect(screen.getByTestId('create-room-button')).toBeTruthy();
  });
});
