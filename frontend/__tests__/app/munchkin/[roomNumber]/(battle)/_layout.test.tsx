import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stackCalls = vi.hoisted(() => ({
  screens: [] as Array<{ name?: string }>,
  screenOptions: undefined as Record<string, unknown> | undefined,
}));

vi.mock('expo-router', async () => {
  const ReactRuntime = await import('react');

  const Stack = Object.assign(
    ({ children, screenOptions }: { children?: React.ReactNode; screenOptions?: Record<string, unknown> }) => {
      stackCalls.screenOptions = screenOptions;
      return ReactRuntime.createElement(ReactRuntime.Fragment, null, children);
    },
    {
      Screen: ({ name }: { name?: string }) => {
        stackCalls.screens.push({ name });
        return null;
      },
    },
  );

  return { Stack };
});

describe('Battle route layout', () => {
  beforeEach(() => {
    stackCalls.screens = [];
    stackCalls.screenOptions = undefined;
  });

  it('hides the nested battle index header', async () => {
    const { default: BattleLayout } = await import('../../../../../app/munchkin/[roomNumber]/(battle)/_layout');

    render(<BattleLayout />);

    expect(stackCalls.screenOptions).toEqual(expect.objectContaining({ headerShown: false }));
    expect(stackCalls.screens).toEqual(expect.arrayContaining([{ name: 'index' }]));
  });
});
