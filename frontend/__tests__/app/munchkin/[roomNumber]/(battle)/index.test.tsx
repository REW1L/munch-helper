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
  current: {
    isLoading: false,
    errorMessage: null,
  },
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
    mockBattleActions.patch.mockReset();
    mockBattleActions.current = { isLoading: false, errorMessage: null };
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
        playerSide: { characterIds: ['character-1', 'character-2'], bonuses: [{ id: 'bonus-new', value: 1 }] },
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
});
