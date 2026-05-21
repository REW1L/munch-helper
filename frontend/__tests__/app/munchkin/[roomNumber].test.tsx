import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { userProfileContext } from '@/context/UserContext';
import type { Character } from '@/api/characters';
import type { Battle } from '@/api/battles';
import { ApiError } from '@/api/http';

const mockSetStringAsync = vi.hoisted(() => vi.fn());
const mockRoomNumber = vi.hoisted(() => ({ current: 'ROOM42' as string | string[] | undefined }));
const mockCreateCharacter = vi.hoisted(() => vi.fn());
const mockUpdateCharacter = vi.hoisted(() => vi.fn());
const mockRemoveCharacter = vi.hoisted(() => vi.fn());
const mockRefreshCharacters = vi.hoisted(() => vi.fn());
const mockStartBattle = vi.hoisted(() => vi.fn());
const mockRefreshBattle = vi.hoisted(() => vi.fn());
const mockRouterPush = vi.hoisted(() => vi.fn());
const mockReconnect = vi.hoisted(() => vi.fn());
const mockUseReconnectOnForeground = vi.hoisted(() => vi.fn());
const mockIsCreateBlocked = vi.hoisted(() => ({ current: false }));
const mockConnectionState = vi.hoisted(() => ({
  current: {
    isConnected: true,
    isReconnecting: false,
    isTimedOut: false,
  },
}));
const mockCharactersState = vi.hoisted(() => ({
  current: [] as Character[],
}));
const mockBattleState = vi.hoisted(() => ({
  current: {
    battle: null as Battle | null,
    isLoading: false,
    errorMessage: null as string | null,
  },
}));

const activeBattle: Battle = {
  id: 'battle-1',
  roomId: 'ROOM42',
  name: 'Existing Battle',
  status: 'active',
  playerSide: { characterIds: [], bonuses: [] },
  monsterSide: { monsters: [], bonuses: [] },
  result: null,
  concludedAt: null,
};
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
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock('@/hooks/useCharacters', () => ({
  useRoomCharacters: () => ({
    characters: mockCharactersState.current,
    create: mockCreateCharacter,
    update: mockUpdateCharacter,
    remove: mockRemoveCharacter,
    refresh: mockRefreshCharacters,
    reconnect: mockReconnect,
    isConnected: mockConnectionState.current.isConnected,
    isReconnecting: mockConnectionState.current.isReconnecting,
    isTimedOut: mockConnectionState.current.isTimedOut,
    isCreateBlocked: mockIsCreateBlocked.current,
    isLoading: false,
    errorMessage: null,
  }),
}));

vi.mock('@/hooks/useRoomBattle', () => ({
  useRoomBattle: () => ({
    battle: mockBattleState.current.battle,
    isLoading: mockBattleState.current.isLoading,
    errorMessage: mockBattleState.current.errorMessage,
    refresh: mockRefreshBattle,
  }),
}));

vi.mock('@/hooks/useBattleActions', () => ({
  useBattleActions: () => ({
    start: mockStartBattle,
    isLoading: false,
    errorMessage: null,
  }),
}));

vi.mock('@/hooks/useReconnectOnForeground', () => ({
  useReconnectOnForeground: mockUseReconnectOnForeground,
}));

vi.mock('../../../components/munchkin/RoomCharactersList', () => ({
  default: ({
    characters,
    actionError,
    isCreateBlocked,
    onCreateCharacter,
    onChangePress,
  }: {
    characters: Character[];
    actionError?: string | null;
    isCreateBlocked: boolean;
    onCreateCharacter: () => void;
    onChangePress: (character: Character) => void;
  }) => (
    <div>
      {actionError ? <div>{actionError}</div> : null}
      <button type="button" disabled={isCreateBlocked} onClick={onCreateCharacter}>
        Create a character
      </button>
      {characters.map((character) => (
        <div key={character.id}>
          <div>{`${character.nickname}: ${character.level} lvl / ${character.power} str`}</div>
          <button type="button" onClick={() => onChangePress(character)}>
            {`Change ${character.nickname}`}
          </button>
        </div>
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
  default: ({
    character,
    deleteError,
    onDelete,
    onCancel,
  }: {
    character?: Character;
    deleteError?: string | null;
    onDelete: (characterId: string) => Promise<void>;
    onCancel: () => void;
  }) => {
    const [confirmVisible, setConfirmVisible] = React.useState(false);
    if (!character) {
      return null;
    }

    return (
      <div>
        <div>{`Edit ${character.nickname}`}</div>
        <button type="button" onClick={() => setConfirmVisible(true)}>
          Delete character
        </button>
        {confirmVisible ? (
          <div>
            <button type="button" onClick={() => setConfirmVisible(false)}>
              Cancel delete
            </button>
            <button type="button" onClick={() => void onDelete(character.id)}>
              Confirm delete
            </button>
          </div>
        ) : null}
        {deleteError ? <div>{deleteError}</div> : null}
        <button type="button" onClick={onCancel}>
          Close edit
        </button>
      </div>
    );
  },
}));

vi.mock('../../../app/munchkin/modal-create-character', () => ({
  default: () => null,
}));

vi.mock('../../../components/munchkin/QuickEditSheet', () => ({
  default: ({
    visible,
    character,
    onSave,
    onOpenFullEdit,
  }: {
    visible: boolean;
    character: Character | null;
    onSave: (stats: { level: number; power: number }) => Promise<void>;
    onOpenFullEdit: () => void;
  }) =>
    visible && character ? (
      <div>
        <div>{`Quick edit for ${character.nickname}`}</div>
        <button type="button" onClick={() => void onSave({ level: character.level + 2, power: character.power + 1 })}>
          Save quick edit
        </button>
        <button type="button" onClick={onOpenFullEdit}>
          Open full edit
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
    mockRemoveCharacter.mockReset();
    mockRefreshCharacters.mockReset();
    mockStartBattle.mockReset();
    mockRefreshBattle.mockReset();
    mockRouterPush.mockReset();
    mockReconnect.mockReset();
    mockUseReconnectOnForeground.mockReset();
    mockIsCreateBlocked.current = false;
    mockConnectionState.current = {
      isConnected: true,
      isReconnecting: false,
      isTimedOut: false,
    };
    mockCreateCharacter.mockResolvedValue(undefined);
    mockUpdateCharacter.mockResolvedValue(undefined);
    mockRemoveCharacter.mockResolvedValue(undefined);
    mockRefreshCharacters.mockResolvedValue(undefined);
    mockStartBattle.mockResolvedValue(undefined);
    mockRefreshBattle.mockResolvedValue(undefined);
    mockReconnect.mockResolvedValue(undefined);
    mockCharactersState.current = [];
    mockBattleState.current = {
      battle: null,
      isLoading: false,
      errorMessage: null,
    };
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

  it('renders existing room characters immediately for a late joiner', async () => {
    mockCharactersState.current = [
      {
        id: 'char-rogue',
        roomId: 'ROOM42',
        userId: 'user-2',
        nickname: 'Rogue',
        avatar: 2,
        color: '#0088CC',
        level: 4,
        power: 1,
        class: ['Thief'],
        race: ['Elf'],
        gender: ['female'],
      },
      {
        id: 'char-mage',
        roomId: 'ROOM42',
        userId: 'user-3',
        nickname: 'Mage',
        avatar: 3,
        color: '#BB44DD',
        level: 5,
        power: 6,
        class: ['Wizard'],
        race: ['Human'],
        gender: ['female'],
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

    expect(screen.getByText('Rogue: 4 lvl / 1 str')).toBeTruthy();
    expect(screen.getByText('Mage: 5 lvl / 6 str')).toBeTruthy();
    expect(mockCreateCharacter).not.toHaveBeenCalled();
  });

  it('renders delete actions for own character full edit and requires explicit confirmation', async () => {
    mockCharactersState.current = [
      {
        id: 'char-self',
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open quick edit' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open full edit' }));
    });

    expect(screen.getByText('Edit Player One')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete character' })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete character' }));
    });

    expect(mockRemoveCharacter).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel delete' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel delete' }));
    });

    expect(mockRemoveCharacter).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Confirm delete' })).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete character' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
      await Promise.resolve();
    });

    expect(mockRemoveCharacter).toHaveBeenCalledWith('char-self');
  });

  it('disables global create while current-user delete is still pending', async () => {
    mockIsCreateBlocked.current = true;
    mockCharactersState.current = [
      {
        id: 'char-self',
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

    const createButton = screen.getByRole('button', { name: 'Create a character' });
    expect(createButton.getAttribute('disabled')).toBe('');
  });

  it('renders delete actions for other users and shows failure errors after confirmed delete', async () => {
    mockCharactersState.current = [
      {
        id: 'char-other',
        roomId: 'ROOM42',
        userId: 'user-2',
        nickname: 'Rogue',
        avatar: 2,
        color: '#0088CC',
        level: 4,
        power: 1,
        class: ['Thief'],
        race: ['Elf'],
        gender: ['female'],
      },
    ];
    mockRemoveCharacter.mockRejectedValueOnce(new Error('Delete failed'));

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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Change Rogue' }));
    });

    expect(screen.getByText('Edit Rogue')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete character' })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete character' }));
    });

    expect(mockRemoveCharacter).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
      await Promise.resolve();
    });

    expect(mockRemoveCharacter).toHaveBeenCalledWith('char-other');
    expect(screen.getByText('Edit Rogue')).toBeTruthy();
    expect(screen.getByText('Delete failed')).toBeTruthy();
  });

  it('keeps a newer selection open when an earlier delete resolves late', async () => {
    let resolveDelete!: () => void;
    mockCharactersState.current = [
      {
        id: 'char-first',
        roomId: 'ROOM42',
        userId: 'user-2',
        nickname: 'Rogue',
        avatar: 2,
        color: '#0088CC',
        level: 4,
        power: 1,
        class: ['Thief'],
        race: ['Elf'],
        gender: ['female'],
      },
      {
        id: 'char-second',
        roomId: 'ROOM42',
        userId: 'user-3',
        nickname: 'Mage',
        avatar: 3,
        color: '#BB44DD',
        level: 5,
        power: 6,
        class: ['Wizard'],
        race: ['Human'],
        gender: ['female'],
      },
    ];
    mockRemoveCharacter.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );

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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Change Rogue' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete character' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
      await Promise.resolve();
    });

    expect(screen.getByText('Edit Rogue')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Change Mage' }));
    });

    expect(screen.getByText('Edit Mage')).toBeTruthy();

    await act(async () => {
      resolveDelete();
      await Promise.resolve();
    });

    expect(screen.getByText('Edit Mage')).toBeTruthy();
    expect(screen.queryByText('Edit Rogue')).toBeNull();
  });

  it('does not surface a late delete failure on a newer selection', async () => {
    let rejectDelete!: (error?: unknown) => void;
    mockCharactersState.current = [
      {
        id: 'char-first',
        roomId: 'ROOM42',
        userId: 'user-2',
        nickname: 'Rogue',
        avatar: 2,
        color: '#0088CC',
        level: 4,
        power: 1,
        class: ['Thief'],
        race: ['Elf'],
        gender: ['female'],
      },
      {
        id: 'char-second',
        roomId: 'ROOM42',
        userId: 'user-3',
        nickname: 'Mage',
        avatar: 3,
        color: '#BB44DD',
        level: 5,
        power: 6,
        class: ['Wizard'],
        race: ['Human'],
        gender: ['female'],
      },
    ];
    mockRemoveCharacter.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectDelete = reject;
        })
    );

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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Change Rogue' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete character' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
      await Promise.resolve();
    });

    expect(screen.getByText('Edit Rogue')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Change Mage' }));
    });

    expect(screen.getByText('Edit Mage')).toBeTruthy();

    await act(async () => {
      rejectDelete(new Error('Delete failed'));
      await Promise.resolve();
    });

    expect(screen.getByText('Edit Mage')).toBeTruthy();
    expect(screen.queryByText('Delete failed')).toBeNull();
  });

  it('renders connection retry action after reconnect timeout and refreshes after retry', async () => {
    mockConnectionState.current = {
      isConnected: false,
      isReconnecting: false,
      isTimedOut: true,
    };
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

    const retryButton = screen.getByRole('button', { name: 'Connection lost. Tap to retry' });
    expect(screen.queryByText('Reconnecting…')).toBeNull();
    expect(screen.getByText('Connection lost · Retry')).toBeTruthy();

    await act(async () => {
      fireEvent.click(retryButton);
      await Promise.resolve();
    });

    expect(mockReconnect).toHaveBeenCalledTimes(1);
    expect(mockRefreshCharacters).toHaveBeenCalledTimes(1);
    expect(mockRefreshBattle).toHaveBeenCalledTimes(1);
  });

  it('renders reconnecting banner without the retry action while reconnect is in flight', async () => {
    mockConnectionState.current = {
      isConnected: false,
      isReconnecting: true,
      isTimedOut: false,
    };
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

    expect(screen.getByText('Reconnecting…')).toBeTruthy();
    expect(screen.queryByText('Connection lost · Retry')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Connection lost. Tap to retry' })).toBeNull();
  });

  it('renders neither reconnecting banner nor retry action while connected', async () => {
    mockConnectionState.current = {
      isConnected: true,
      isReconnecting: false,
      isTimedOut: false,
    };
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

    expect(screen.queryByText('Reconnecting…')).toBeNull();
    expect(screen.queryByText('Connection lost · Retry')).toBeNull();
  });

  it('skips foreground reconnect registration while already connected', async () => {
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

    expect(mockUseReconnectOnForeground).toHaveBeenCalledWith(false, expect.any(Function));
  });

  it('closes the change modal when the selected character is deleted remotely', async () => {
    mockCharactersState.current = [
      {
        id: 'char-remote',
        roomId: 'ROOM42',
        userId: 'user-2',
        nickname: 'Rogue',
        avatar: 2,
        color: '#0088CC',
        level: 4,
        power: 1,
        class: ['Thief'],
        race: ['Elf'],
        gender: ['female'],
      },
    ];

    const { default: MunchkinIndexView } = await import('../../../app/munchkin/[roomNumber]/index');

    const view = render(
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Change Rogue' }));
    });

    expect(screen.getByText('Edit Rogue')).toBeTruthy();

    mockCharactersState.current = [];

    await act(async () => {
      view.rerender(
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

    expect(screen.queryByText('Edit Rogue')).toBeNull();
  });

  it('starts a battle from the room and opens the battle view', async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open battle' }));
      await Promise.resolve();
    });

    expect(mockStartBattle).toHaveBeenCalledWith(expect.objectContaining({
      roomId: 'ROOM42',
      name: expect.stringMatching(/^Battle /),
    }));
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/munchkin/[roomNumber]/(battle)',
      params: { roomNumber: 'ROOM42' },
    });
  });

  it('shows an active battle banner above the room list and does not auto-navigate on mount', async () => {
    mockBattleState.current.battle = activeBattle;
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

    expect(screen.getByTestId('active-battle-banner')).toBeTruthy();
    expect(screen.getByText('Existing Battle')).toBeTruthy();
    expect(screen.getByText('View Battle →')).toBeTruthy();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('opens the battle view from the active battle banner', async () => {
    mockBattleState.current.battle = activeBattle;
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Battle in progress. Tap to view.' }));
    });

    expect(mockStartBattle).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/munchkin/[roomNumber]/(battle)',
      params: { roomNumber: 'ROOM42' },
    });
  });

  it('hides the active battle banner when no battle is active and keeps the battle button available', async () => {
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

    expect(screen.queryByTestId('active-battle-banner')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open battle' })).toBeTruthy();
  });

  it('opens the room history log from the visible Log button', async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open room history' }));
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/munchkin/[roomNumber]/log',
      params: { roomNumber: 'ROOM42' },
    });
  });

  it('opens an existing active battle without creating another', async () => {
    mockBattleState.current.battle = activeBattle;
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open battle' }));
    });

    expect(mockStartBattle).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/munchkin/[roomNumber]/(battle)',
      params: { roomNumber: 'ROOM42' },
    });
  });

  it('routes to the existing battle from a 409 payload without a second round-trip', async () => {
    mockStartBattle.mockRejectedValueOnce(new ApiError('Already active', 409, { activeBattleId: 'battle-1' }));
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open battle' }));
      await Promise.resolve();
    });

    expect(mockStartBattle).toHaveBeenCalledTimes(1);
    expect(mockRefreshBattle).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/munchkin/[roomNumber]/(battle)',
      params: { roomNumber: 'ROOM42' },
    });
    expect(screen.queryByText('Could not start the battle. Please try again.')).toBeNull();
  });

  it('re-syncs and surfaces a retry error when a 409 carries no activeBattleId', async () => {
    mockStartBattle.mockRejectedValueOnce(
      new ApiError('A battle is already active for this room', 409, {
        message: 'A battle is already active for this room',
      })
    );
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open battle' }));
      await Promise.resolve();
    });

    expect(mockRefreshBattle).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(screen.getByText('Could not start the battle. Please try again.')).toBeTruthy();
  });
});
