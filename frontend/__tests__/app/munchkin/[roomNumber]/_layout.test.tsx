import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stackScreens = vi.hoisted(() => ({
  current: [] as Array<{ name?: string; options?: Record<string, unknown> }>,
}));
const mockSegments = vi.hoisted(() => ({
  current: ['munchkin', '[roomNumber]'] as string[],
}));
const mockBattleState = vi.hoisted(() => ({
  current: {
    battle: {
      name: 'Dungeon Door',
    } as { name: string } | null,
  },
}));
const mockRouterBack = vi.hoisted(() => vi.fn());

vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock('@/hooks/useRoomBattle', () => ({
  useRoomBattle: () => mockBattleState.current,
}));

vi.mock('expo-router', async () => {
  const ReactRuntime = await import('react');

  const Stack = Object.assign(
    ({ children }: { children?: React.ReactNode }) => ReactRuntime.createElement(ReactRuntime.Fragment, null, children),
    {
      Screen: ({ name, options }: { name?: string; options?: Record<string, unknown> }) => {
        stackScreens.current.push({ name, options });
        return null;
      },
    },
  );

  return {
    Stack,
    useLocalSearchParams: () => ({ roomNumber: 'ROOM42' }),
    useRouter: () => ({
      back: mockRouterBack,
    }),
    useSegments: () => mockSegments.current,
  };
});

describe('Room route layout', () => {
  beforeEach(() => {
    stackScreens.current = [];
    mockSegments.current = ['munchkin', '[roomNumber]'];
    mockBattleState.current = {
      battle: {
        name: 'Dungeon Door',
      },
    };
    mockRouterBack.mockClear();
  });

  it('shows the room header only for the room route and preserves battle modal routing', async () => {
    const { default: RoomLayout } = await import('../../../../app/munchkin/[roomNumber]/_layout');

    render(<RoomLayout />);

    expect(stackScreens.current[0]?.options).toEqual(
      expect.objectContaining({
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerBackVisible: undefined,
        headerLeft: undefined,
        headerTitle: expect.any(Function),
        title: undefined,
      }),
    );
    expect(stackScreens.current).toEqual(
      expect.arrayContaining([
        {
          name: 'index',
          options: expect.objectContaining({ headerShown: false }),
        },
        {
          name: '(battle)',
          options: expect.objectContaining({ presentation: 'modal', headerShown: false }),
        },
      ]),
    );
  });

  it('uses the stable parent header as the battle header on the battle route', async () => {
    mockSegments.current = ['munchkin', '[roomNumber]', '(battle)'];
    const { default: RoomLayout } = await import('../../../../app/munchkin/[roomNumber]/_layout');

    render(<RoomLayout />);

    expect(stackScreens.current[0]?.options).toEqual(
      expect.objectContaining({
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerBackVisible: false,
        headerLeft: expect.any(Function),
        headerTitle: undefined,
        title: 'Dungeon Door',
      }),
    );
  });

  it('routes the battle header back button to the current room', async () => {
    mockSegments.current = ['munchkin', '[roomNumber]', '(battle)'];
    const { default: RoomLayout } = await import('../../../../app/munchkin/[roomNumber]/_layout');

    render(<RoomLayout />);

    const headerLeft = stackScreens.current[0]?.options?.headerLeft as (() => React.ReactElement) | undefined;
    const backButton = headerLeft?.();
    const backButtonProps = backButton?.props as { onPress: () => void } | undefined;
    backButtonProps?.onPress();

    expect(mockRouterBack).toHaveBeenCalledOnce();
  });
});
