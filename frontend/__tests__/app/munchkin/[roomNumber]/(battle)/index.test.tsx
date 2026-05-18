import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Battle } from '@/api/battles';

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

describe('Battle view', () => {
  beforeEach(() => {
    mockBattleState.current = mockBattleState.createState();
  });

  it('renders the loaded active battle state', async () => {
    const { default: BattleView } = await import('../../../../../app/munchkin/[roomNumber]/(battle)');

    render(<BattleView />);

    expect(screen.getByText('Dungeon Door')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
    expect(screen.getByText('Player Side')).toBeTruthy();
    expect(screen.getByText('Monster Side')).toBeTruthy();
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
});
