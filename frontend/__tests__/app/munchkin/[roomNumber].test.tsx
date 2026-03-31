import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { userProfileContext } from '@/context/UserContext';
import type { Character } from '@/api/characters';

const mockSetStringAsync = vi.hoisted(() => vi.fn());
const mockRoomNumber = vi.hoisted(() => ({ current: 'ROOM42' as string | string[] | undefined }));
const mockCreateCharacter = vi.hoisted(() => vi.fn());
const mockUpdateCharacter = vi.hoisted(() => vi.fn());
const mockCharactersState = vi.hoisted(() => ({
  current: [] as Character[],
}));
vi.mock('expo-clipboard', () => ({
  setStringAsync: mockSetStringAsync,
}));

vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: vi.fn(() => Promise.resolve()),
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
    characters: mockCharactersState.current,
    create: mockCreateCharacter,
    update: mockUpdateCharacter,
    isLoading: false,
    errorMessage: null,
  }),
}));

vi.mock('../../../components/munchkin/RoomCharactersList', () => ({
  default: ({ characters }: { characters: Character[] }) => (
    <div>
      {characters.map((character) => (
        <div key={character.id}>{`${character.nickname}: ${character.level} lvl / ${character.power} str`}</div>
      ))}
    </div>
  ),
}));

vi.mock('../../../components/munchkin/CurrentCharacterFooter', () => ({
  default: ({
    character,
    onChangePress,
  }: {
    character: Character;
    onChangePress: (character: Character) => void;
  }) => (
    <div>
      <div>{`Footer ${character.level} lvl / ${character.power} str`}</div>
      <button type="button" onClick={() => onChangePress(character)}>
        Open quick edit
      </button>
    </div>
  ),
}));

vi.mock('../../../app/munchkin/modal-change-caracter', () => ({
  default: () => null,
}));

vi.mock('../../../app/munchkin/modal-create-character', () => ({
  default: () => null,
}));

vi.mock('../../../components/munchkin/QuickEditSheet', () => ({
  default: ({
    visible,
    character,
    onSave,
  }: {
    visible: boolean;
    character: Character | null;
    onSave: (stats: { level: number; power: number }) => Promise<void>;
  }) =>
    visible && character ? (
      <div>
        <div>{`Quick edit for ${character.nickname}`}</div>
        <button type="button" onClick={() => void onSave({ level: character.level + 2, power: character.power + 1 })}>
          Save quick edit
        </button>
      </div>
    ) : null,
}));

describe('Munchkin room header', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSetStringAsync.mockReset();
    mockSetStringAsync.mockResolvedValue(true);
    mockCreateCharacter.mockReset();
    mockUpdateCharacter.mockReset();
    mockCreateCharacter.mockResolvedValue(undefined);
    mockUpdateCharacter.mockResolvedValue(undefined);
    mockCharactersState.current = [];
    mockRoomNumber.current = 'ROOM42';
    latestHeaderOptions.current = undefined;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('keeps the header copy accessibility label stable and resets copied label after 1500ms', async () => {
    const { default: MunchkinIndexView } = await import('../../../app/munchkin/[roomNumber]/index');

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
    const { default: MunchkinIndexView } = await import('../../../app/munchkin/[roomNumber]/index');

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

  it('keeps room stats unchanged until quick edit save is pressed', async () => {
    mockCharactersState.current = [
      {
        id: 'char-1',
        roomId: 'ROOM42',
        userId: 'user-1',
        nickname: 'Player One',
        avatar: 1,
        color: '#9966FF',
        level: 1,
        power: 0,
        class: [],
        race: ['Human'],
        gender: ['male'],
      },
    ];

    const { default: MunchkinIndexView } = await import('../../../app/munchkin/[roomNumber]/index');

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

    expect(screen.getByText('Player One: 1 lvl / 0 str')).toBeTruthy();
    expect(screen.getByText('Footer 1 lvl / 0 str')).toBeTruthy();
    expect(mockUpdateCharacter).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open quick edit' }));
    });

    expect(screen.getByText('Quick edit for Player One')).toBeTruthy();
    expect(screen.getByText('Footer 1 lvl / 0 str')).toBeTruthy();
    expect(mockUpdateCharacter).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save quick edit' }));
      await Promise.resolve();
      vi.runOnlyPendingTimers();
    });

    expect(mockUpdateCharacter).toHaveBeenCalledWith('char-1', { level: 3, power: 1 });
  });
});
