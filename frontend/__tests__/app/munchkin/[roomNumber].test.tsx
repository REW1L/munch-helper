import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { userProfileContext } from '@/context/UserContext';

const mockSetStringAsync = vi.hoisted(() => vi.fn());
const mockRoomNumber = vi.hoisted(() => ({ current: 'ROOM42' as string | string[] | undefined }));
vi.mock('expo-clipboard', () => ({
  setStringAsync: mockSetStringAsync,
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

const latestHeaderOptions = vi.hoisted(() => ({ current: undefined as { headerTitle?: () => React.ReactNode } | undefined }));

vi.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: { options?: { headerTitle?: () => React.ReactNode } }) => {
      latestHeaderOptions.current = options;
      return null;
    },
  },
  useLocalSearchParams: () => ({
    roomNumber: mockRoomNumber.current,
  }),
}));

vi.mock('@/hooks/useCharacters', () => ({
  useRoomCharacters: () => ({
    characters: [],
    create: vi.fn(),
    update: vi.fn(),
    isLoading: false,
    errorMessage: null,
  }),
}));

vi.mock('../../../components/munchkin/RoomCharactersList', () => ({
  default: () => null,
}));

vi.mock('../../../components/munchkin/CurrentCharacterFooter', () => ({
  default: () => null,
}));

vi.mock('../../../app/munchkin/modal-change-caracter', () => ({
  default: () => null,
}));

vi.mock('../../../app/munchkin/modal-create-character', () => ({
  default: () => null,
}));

describe('Munchkin room header', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSetStringAsync.mockReset();
    mockSetStringAsync.mockResolvedValue(true);
    mockRoomNumber.current = 'ROOM42';
    latestHeaderOptions.current = undefined;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('keeps the header copy accessibility label stable and resets copied label after 1500ms', async () => {
    const { default: MunchkinIndexView } = await import('../../../app/munchkin/[roomNumber]');

    await act(async () => {
      render(
        <userProfileContext.Provider
          value={{
            userProfile: {
              id: 'user-1',
              nickname: 'Player One',
              avatar: 1,
            },
            setUserProfile: vi.fn(),
          }}
        >
          <MunchkinIndexView />
        </userProfileContext.Provider>
      );
    });

    expect(latestHeaderOptions.current?.headerTitle).toBeTypeOf('function');

    const header = render(latestHeaderOptions.current!.headerTitle!());
    expect(screen.getByText('Room')).toBeTruthy();
    expect(screen.getByText('ROOM42')).toBeTruthy();

    let copyButton = screen.getByRole('button', { name: 'Copy room code ROOM42' });
    expect(copyButton).toBeTruthy();

    await act(async () => {
      fireEvent.click(copyButton);
    });

    header.rerender(latestHeaderOptions.current!.headerTitle!());

    expect(mockSetStringAsync).toHaveBeenCalledWith('ROOM42');
    copyButton = screen.getByRole('button', { name: 'Copy room code ROOM42' });
    expect(copyButton).toBeTruthy();
    expect(screen.getByText('Copied ✓')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    header.rerender(latestHeaderOptions.current!.headerTitle!());

    copyButton = screen.getByRole('button', { name: 'Copy room code ROOM42' });
    expect(copyButton).toBeTruthy();
    expect(screen.getByText('Copy')).toBeTruthy();
  });

  it('disables copy button when route roomNumber is missing', async () => {
    mockRoomNumber.current = undefined;
    const { default: MunchkinIndexView } = await import('../../../app/munchkin/[roomNumber]');

    await act(async () => {
      render(
        <userProfileContext.Provider
          value={{
            userProfile: {
              id: 'user-1',
              nickname: 'Player One',
              avatar: 1,
            },
            setUserProfile: vi.fn(),
          }}
        >
          <MunchkinIndexView />
        </userProfileContext.Provider>
      );
    });

    expect(latestHeaderOptions.current?.headerTitle).toBeTypeOf('function');
    render(latestHeaderOptions.current!.headerTitle!());

    const copyButton = screen.getByRole('button', { name: 'Copy room code' });
    expect(copyButton.getAttribute('aria-disabled')).toBe('true');

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(mockSetStringAsync).not.toHaveBeenCalled();
    expect(screen.getByText('Copy')).toBeTruthy();
  });
});
