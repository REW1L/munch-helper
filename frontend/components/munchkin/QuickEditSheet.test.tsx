import { Character } from '@/api/characters';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import QuickEditSheet from './QuickEditSheet';

const mockImpactAsync = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Light: 'light',
  },
  impactAsync: mockImpactAsync,
}));


vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    ...actual,
    Modal: ({ children }: { children?: React.ReactNode }) => children,
  };
});
const baseCharacter: Character = {
  id: 'char-1',
  roomId: 'room-1',
  userId: 'user-1',
  nickname: 'Rogue',
  avatar: 0,
  color: '#AABBCC',
  level: 5,
  power: 3,
  class: ['Thief'],
  race: ['Human'],
  gender: ['Female'],
};

describe('QuickEditSheet', () => {
  it('renders a 60% bottom sheet and applies floor zero on steppers', async () => {
    const onStatsChange = vi.fn();

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <QuickEditSheet
          visible
          character={baseCharacter}
          onClose={vi.fn()}
          onStatsChange={onStatsChange}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    const sheet = renderer!.root.findByProps({ testID: 'quick-edit-sheet' });
    expect(sheet.props.style[0].height).toBe('60%');

    const buttons = renderer!.root.findAllByType(TouchableOpacity);

    await act(async () => {
      buttons[0].props.onPress();
    });

    expect(onStatsChange).toHaveBeenCalledWith({ level: 4, power: 3 });
    expect(mockImpactAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      buttons[0].props.onPress();
      buttons[0].props.onPress();
      buttons[0].props.onPress();
      buttons[0].props.onPress();
      buttons[0].props.onPress();
    });

    const updates = onStatsChange.mock.calls.map(([value]) => value.level);
    expect(Math.min(...updates)).toBeGreaterThanOrEqual(0);
  });
});
