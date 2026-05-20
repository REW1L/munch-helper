import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Battle } from '@/api/battles';
import { ApiError } from '@/api/http';
import { AppTheme } from '@/constants/theme';

const mockBattleState = vi.hoisted(() => {
  const createState = (): {
    battle: Battle | null;
    isLoading: boolean;
    errorMessage: string | null;
  } => ({
    battle: {
      id: 'battle-1',
      roomId: 'ROOM42',
      name: 'Dungeon Door',
      status: 'active',
      playerSide: { characterIds: [], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
      result: null,
      concludedAt: null,
    },
    isLoading: false,
    errorMessage: null,
  });

  return { current: createState(), createState };
});

const mockCharactersState = vi.hoisted(() => ({
  current: {
    characters: [
      { id: 'character-1', roomId: 'ROOM42', userId: 'user-1', nickname: 'Alice', avatar: 0, level: 4, power: 0, class: [], race: [], gender: [], color: '#FFFFFF' },
      { id: 'character-2', roomId: 'ROOM42', userId: 'user-2', nickname: 'Bob', avatar: 1, level: 2, power: 0, class: [], race: [], gender: [], color: '#FFFFFF' },
    ],
    isLoading: false,
    errorMessage: null,
  },
}));

const mockBattleActions = vi.hoisted(() => ({
  patch: vi.fn(),
  conclude: vi.fn(),
  current: {
    isLoading: false,
    errorMessage: null,
  },
}));

const mockRouter = vi.hoisted(() => ({
  back: vi.fn(),
}));

function hexToRgbStyleValue(hex: string): string {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgb(${red}, ${green}, ${blue})`;
}

vi.mock('react-native-safe-area-context', async () => {
  const ReactRuntime = await import('react');

  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
      ReactRuntime.createElement('div', props, children),
  };
});

vi.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({
    roomNumber: 'ROOM42',
  }),
  useRouter: () => mockRouter,
}));

vi.mock('@/hooks/useRoomBattle', () => ({
  useRoomBattle: () => mockBattleState.current,
}));

vi.mock('@/hooks/useCharacters', () => ({
  useRoomCharacters: () => mockCharactersState.current,
}));

vi.mock('@/hooks/useUser', () => ({
  useUserProfile: () => ({
    userProfile: { id: 'user-1', nickname: 'Alice', avatar: 0 },
    setUserProfile: vi.fn(),
  }),
}));

vi.mock('@/hooks/useBattleActions', () => ({
  useBattleActions: () => ({
    patch: mockBattleActions.patch,
    conclude: mockBattleActions.conclude,
    isLoading: mockBattleActions.current.isLoading,
    errorMessage: mockBattleActions.current.errorMessage,
    start: vi.fn(),
  }),
}));

vi.mock('@/utils/uuid', () => ({
  createUuidV4: vi.fn()
    .mockReturnValueOnce('bonus-new')
    .mockReturnValueOnce('monster-new')
    .mockReturnValueOnce('monster-bonus-new'),
}));

vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'Light' },
  impactAsync: vi.fn().mockResolvedValue(undefined),
}));

describe('Battle view', () => {
  beforeEach(() => {
    mockBattleState.current = mockBattleState.createState();
    mockCharactersState.current = {
      characters: [
        { id: 'character-1', roomId: 'ROOM42', userId: 'user-1', nickname: 'Alice', avatar: 0, level: 4, power: 0, class: [], race: [], gender: [], color: '#FFFFFF' },
        { id: 'character-2', roomId: 'ROOM42', userId: 'user-2', nickname: 'Bob', avatar: 1, level: 2, power: 0, class: [], race: [], gender: [], color: '#FFFFFF' },
      ],
      isLoading: false,
      errorMessage: null,
    };
    mockBattleActions.patch.mockReset();
    mockBattleActions.conclude.mockReset();
    mockBattleActions.patch.mockImplementation(async (_battleId: string, payload: Partial<Battle>) => ({
      ...mockBattleState.current.battle!,
      ...payload,
    }));
    mockBattleActions.conclude.mockImplementation(async (_battleId: string, result: Battle['result']) => ({
      ...mockBattleState.current.battle!,
      status: 'concluded',
      result,
      concludedAt: '2026-05-17T12:00:00.000Z',
    }));
    mockBattleActions.current = { isLoading: false, errorMessage: null };
    mockRouter.back.mockReset();
  });

  it('renders the loaded active battle state', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');

    render(<BattleView />);

    expect(screen.getByDisplayValue('Dungeon Door')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
    expect(screen.getByText('Player Side')).toBeTruthy();
    expect(screen.getByText('Monster Side')).toBeTruthy();
    expect(screen.getByTestId('battle-comparison-label').textContent).toBe('Even');
    expect(screen.getByTestId('battle-comparison-container').getAttribute('style')).toContain(hexToRgbStyleValue(AppTheme.colors.surfaceSubtle));
    expect(screen.getByTestId('battle-conclude-button').getAttribute('aria-disabled')).toBe('true');
  });

  it('syncs the visible draft when the same battle refetches and there are no local edits', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');

    const view = render(<BattleView />);
    expect(screen.getByDisplayValue('Dungeon Door')).toBeTruthy();

    mockBattleState.current.battle = {
      ...mockBattleState.current.battle!,
      name: 'Remote Update',
      monsterSide: {
        monsters: [{ id: 'monster-1', name: 'Fungeater', level: 5 }],
        bonuses: [],
      },
    };
    view.rerender(<BattleView />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Remote Update')).toBeTruthy();
      expect(screen.getByTestId('battle-comparison-label').textContent).toBe('Monsters ahead');
    });
  });

  it('preserves unsaved local edits when the same battle refetches', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');

    const view = render(<BattleView />);
    fireEvent.change(screen.getByTestId('battle-name-input'), { target: { value: 'Local Edit' } });

    mockBattleState.current.battle = {
      ...mockBattleState.current.battle!,
      name: 'Remote Update',
    };
    view.rerender(<BattleView />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Local Edit')).toBeTruthy();
    });
  });

  it.each([
    ['Players ahead', ['character-1'], [], AppTheme.colors.accent],
    ['Monsters ahead', [], [{ id: 'monster-1', name: 'Fungeater', level: 5 }], AppTheme.colors.danger],
  ])('uses the correct comparison border when %s', async (label, characterIds, monsters, borderColor) => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleState.current.battle = {
      ...mockBattleState.current.battle!,
      playerSide: { characterIds, bonuses: [] },
      monsterSide: { monsters, bonuses: [] },
    };

    render(<BattleView />);

    expect(screen.getByTestId('battle-comparison-label').textContent).toBe(label);
    expect(screen.getByTestId('battle-comparison-container').getAttribute('style')).toContain(hexToRgbStyleValue(borderColor));
  });

  it('renders error and empty states', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');

    mockBattleState.current = {
      battle: null,
      isLoading: false,
      errorMessage: 'Load failed',
    };
    const view = render(<BattleView />);
    expect(screen.getByText('Load failed')).toBeTruthy();

    mockBattleState.current = {
      battle: null,
      isLoading: false,
      errorMessage: null,
    };
    view.rerender(<BattleView />);
    expect(screen.getByText('No active battle')).toBeTruthy();
  });

  it('updates the local draft and saves the full battle side state', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleState.current.battle = {
      ...mockBattleState.current.battle!,
      playerSide: { characterIds: ['character-1'], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
    };
    mockBattleActions.patch.mockResolvedValue({
      ...mockBattleState.current.battle!,
      playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [{ id: 'bonus-new', value: 1 }] },
    });

    render(<BattleView />);

    fireEvent.click(screen.getByTestId('select-character-character-2'));
    fireEvent.click(screen.getByTestId('add-character'));
    fireEvent.click(screen.getByTestId('add-bonus-players-1'));
    fireEvent.click(screen.getByTestId('save-battle'));

    await waitFor(() => {
      expect(mockBattleActions.patch).toHaveBeenCalledWith('battle-1', {
        name: 'Dungeon Door',
        playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [{ id: expect.any(String), value: 1 }] },
        monsterSide: { monsters: [], bonuses: [] },
      });
    });
  });

  it('surfaces non-active patch conflicts', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleActions.patch.mockRejectedValue(new ApiError('Battle is not active', 409, { message: 'Battle is not active' }));

    render(<BattleView />);

    fireEvent.click(screen.getByTestId('select-character-character-1'));
    fireEvent.click(screen.getByTestId('add-character'));
    fireEvent.click(screen.getByTestId('save-battle'));

    await waitFor(() => {
      expect(screen.getByTestId('battle-save-error').textContent).toBe('Battle is not active');
    });
  });

  it('concludes a clean battle with an explicit selected result and dismisses the modal', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');

    render(<BattleView />);

    fireEvent.click(screen.getByTestId('battle-conclude-result-players'));
    fireEvent.click(screen.getByTestId('battle-conclude-button'));

    await waitFor(() => {
      expect(mockBattleActions.conclude).toHaveBeenCalledWith('battle-1', 'players_win');
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  it('surfaces non-active conclude conflicts inline without dismissing', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleActions.conclude.mockRejectedValue(new ApiError('Battle is not active', 409, { message: 'Battle is not active' }));

    render(<BattleView />);

    fireEvent.click(screen.getByTestId('battle-conclude-result-monster'));
    fireEvent.click(screen.getByTestId('battle-conclude-button'));

    await waitFor(() => {
      expect(screen.getByTestId('battle-conclude-error').textContent).toBe('Battle is not active');
      expect(mockRouter.back).not.toHaveBeenCalled();
    });
  });

  it('disables conclude while the draft is dirty and enables it again after save', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleActions.patch.mockResolvedValue({
      ...mockBattleState.current.battle!,
      playerSide: { characterIds: ['character-1'], bonuses: [] },
    });

    render(<BattleView />);

    fireEvent.click(screen.getByTestId('battle-conclude-result-players'));
    expect(screen.getByTestId('battle-conclude-button').getAttribute('aria-disabled')).not.toBe('true');

    fireEvent.click(screen.getByTestId('select-character-character-1'));
    fireEvent.click(screen.getByTestId('add-character'));
    expect(screen.getByTestId('battle-conclude-button').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByTestId('battle-conclude-dirty-hint').textContent).toBe('Save your changes before concluding');

    fireEvent.click(screen.getByTestId('save-battle'));

    await waitFor(() => {
      expect(screen.getByTestId('battle-conclude-button').getAttribute('aria-disabled')).not.toBe('true');
    });
  });

  it('dismisses after a previously active battle refetches to null', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');

    const view = render(<BattleView />);
    mockBattleState.current.battle = null;
    view.rerender(<BattleView />);

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      expect(screen.getByText('No active battle')).toBeTruthy();
    });
  });

  it('disables conclude while the conclude mutation is pending', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleActions.conclude.mockImplementation(() => new Promise(() => undefined));

    render(<BattleView />);

    fireEvent.click(screen.getByTestId('battle-conclude-result-players'));
    fireEvent.click(screen.getByTestId('battle-conclude-button'));

    await waitFor(() => {
      expect(screen.getByTestId('battle-conclude-button').getAttribute('aria-disabled')).toBe('true');
      expect(screen.getByTestId('battle-conclude-button').textContent).toBe('Concluding...');
    });
  });

  it('disables Save when the battle name is empty or whitespace', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');

    render(<BattleView />);

    // Make the draft dirty so Save would otherwise enable.
    fireEvent.click(screen.getByTestId('select-character-character-1'));
    fireEvent.click(screen.getByTestId('add-character'));

    // Blank out the name.
    fireEvent.change(screen.getByTestId('battle-name-input'), { target: { value: '   ' } });

    const saveButton = screen.getByTestId('save-battle');
    expect(saveButton.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(saveButton);
    expect(mockBattleActions.patch).not.toHaveBeenCalled();
  });

  it('derives participating character updates into the player row and total without dirtying the draft', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleState.current.battle = {
      ...mockBattleState.current.battle!,
      playerSide: { characterIds: ['character-1'], bonuses: [{ id: 'bonus-1', value: 1 }] },
      monsterSide: { monsters: [], bonuses: [] },
    };

    const view = render(<BattleView />);
    expect(screen.getByText('Alice · Level 4')).toBeTruthy();
    expect(screen.getByTestId('battle-players-total').textContent).toBe('5');
    expect(screen.getByTestId('save-battle').getAttribute('aria-disabled')).toBe('true');

    mockCharactersState.current = {
      ...mockCharactersState.current,
      characters: [
        { ...mockCharactersState.current.characters[0], nickname: 'Alice Prime', level: 9 },
        mockCharactersState.current.characters[1],
      ],
    };
    view.rerender(<BattleView />);

    expect(screen.getByText('Alice Prime · Level 9')).toBeTruthy();
    expect(screen.getByTestId('battle-players-total').textContent).toBe('10');
    expect(screen.getByTestId('save-battle').getAttribute('aria-disabled')).toBe('true');
    expect(mockBattleActions.patch).not.toHaveBeenCalled();
  });

  it('renders deleted participating characters as tombstones and keeps the draft unchanged until explicit save', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleState.current.battle = {
      ...mockBattleState.current.battle!,
      playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
    };

    const view = render(<BattleView />);
    expect(screen.getByTestId('battle-players-total').textContent).toBe('6');

    mockCharactersState.current = {
      ...mockCharactersState.current,
      characters: [mockCharactersState.current.characters[0]],
    };
    view.rerender(<BattleView />);

    expect(screen.getByText('Alice · Level 4')).toBeTruthy();
    expect(screen.getByTestId('battle-participant-removed').textContent).toContain('Removed character');
    expect(screen.queryByText(/character-2/)).toBeNull();
    expect(screen.getByTestId('battle-players-total').textContent).toBe('4');
    expect(screen.getByTestId('save-battle').getAttribute('aria-disabled')).toBe('true');
    expect(mockBattleActions.patch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('add-bonus-players-1'));
    fireEvent.click(screen.getByTestId('save-battle'));

    await waitFor(() => {
      expect(mockBattleActions.patch).toHaveBeenCalledWith('battle-1', {
        name: 'Dungeon Door',
        playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [{ id: expect.any(String), value: 1 }] },
        monsterSide: { monsters: [], bonuses: [] },
      });
    });
  });

  it('ignores non-participating character changes for player rows, total, and dirty state', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleState.current.battle = {
      ...mockBattleState.current.battle!,
      playerSide: { characterIds: ['character-1'], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
    };

    const view = render(<BattleView />);
    const beforeRows = screen.getAllByTestId('battle-participant-active').map((row) => row.textContent);
    const beforeTotal = screen.getByTestId('battle-players-total').textContent;

    mockCharactersState.current = {
      ...mockCharactersState.current,
      characters: [
        mockCharactersState.current.characters[0],
        { ...mockCharactersState.current.characters[1], nickname: 'Bob Updated', level: 12 },
      ],
    };
    view.rerender(<BattleView />);

    expect(screen.getAllByTestId('battle-participant-active').map((row) => row.textContent)).toEqual(beforeRows);
    expect(screen.getByTestId('battle-players-total').textContent).toBe(beforeTotal);
    expect(screen.getByTestId('save-battle').getAttribute('aria-disabled')).toBe('true');
    expect(mockBattleActions.patch).not.toHaveBeenCalled();

    mockCharactersState.current = {
      ...mockCharactersState.current,
      characters: [mockCharactersState.current.characters[0]],
    };
    view.rerender(<BattleView />);

    expect(screen.getAllByTestId('battle-participant-active').map((row) => row.textContent)).toEqual(beforeRows);
    expect(screen.getByTestId('battle-players-total').textContent).toBe(beforeTotal);
    expect(screen.queryByTestId('battle-participant-removed')).toBeNull();
    expect(screen.getByTestId('save-battle').getAttribute('aria-disabled')).toBe('true');
    expect(mockBattleActions.patch).not.toHaveBeenCalled();
  });

  it('uses latest room character state on remount without duplicate or stale participant rows', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockBattleState.current.battle = {
      ...mockBattleState.current.battle!,
      playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [] },
      monsterSide: { monsters: [], bonuses: [] },
    };
    mockCharactersState.current = {
      ...mockCharactersState.current,
      characters: [
        { ...mockCharactersState.current.characters[0], nickname: 'Alice Latest', level: 6 },
      ],
    };

    const view = render(<BattleView />);

    expect(screen.getByText('Alice Latest · Level 6')).toBeTruthy();
    expect(screen.queryByText('Alice · Level 4')).toBeNull();
    expect(screen.getAllByTestId('battle-participant-active')).toHaveLength(1);
    expect(screen.getAllByTestId('battle-participant-removed')).toHaveLength(1);
    expect(screen.getByTestId('battle-players-total').textContent).toBe('6');

    view.unmount();
    render(<BattleView />);

    expect(screen.getAllByTestId('battle-participant-active')).toHaveLength(1);
    expect(screen.getAllByTestId('battle-participant-removed')).toHaveLength(1);
    expect(screen.getByTestId('battle-players-total').textContent).toBe('6');
    expect(mockBattleActions.patch).not.toHaveBeenCalled();
  });

  it('hides optimistic (temp-) characters from the add picker so the just-added participant cannot flip to a tombstone after id swap', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');
    mockCharactersState.current = {
      ...mockCharactersState.current,
      characters: [
        ...mockCharactersState.current.characters,
        { id: 'temp-1700000000000', roomId: 'ROOM42', userId: 'user-1', nickname: 'Pending', avatar: 2, level: 3, power: 0, class: [], race: [], gender: [], color: '#FFFFFF' },
      ],
    };

    render(<BattleView />);

    expect(screen.getByTestId('select-character-character-1')).toBeTruthy();
    expect(screen.getByTestId('select-character-character-2')).toBeTruthy();
    expect(screen.queryByTestId('select-character-temp-1700000000000')).toBeNull();
    expect(screen.queryByText('Pending')).toBeNull();
  });
});
