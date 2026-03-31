import { Character } from '@/api/characters';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Dimensions, TouchableOpacity } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import QuickEditSheet from './QuickEditSheet';

const mockImpactAsync = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockAnimatedTiming = vi.hoisted(() =>
  vi.fn((value: { setValue: (nextValue: number) => void }, config: { toValue: number }) => ({
    start: (callback?: (result: { finished: boolean }) => void) => {
      value.setValue(config.toValue);
      callback?.({ finished: true });
    },
  }))
);
const mockAnimatedParallel = vi.hoisted(() =>
  vi.fn((animations: Array<{ start: (callback?: (result: { finished: boolean }) => void) => void }>) => ({
    start: (callback?: (result: { finished: boolean }) => void) => {
      animations.forEach((animation) => animation.start());
      callback?.({ finished: true });
    },
  }))
);

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
    Animated: {
      ...actual.Animated,
      parallel: mockAnimatedParallel,
      timing: mockAnimatedTiming,
    },
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
  it('exposes the top drag affordance as the movable gesture target', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <QuickEditSheet
          visible
          character={baseCharacter}
          onClose={vi.fn()}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    const dragArea = renderer!.root.findByProps({ testID: 'quick-edit-drag-area' });

    expect(dragArea.props.onStartShouldSetResponder).toBeTypeOf('function');
    expect(dragArea.props.onMoveShouldSetResponder).toBeTypeOf('function');
    expect(dragArea.props.onResponderMove).toBeTypeOf('function');
    expect(dragArea.props.onResponderRelease).toBeTypeOf('function');
  });

  it('keeps the sheet translated off-screen while the modal closes', async () => {
    const onClose = vi.fn();
    const dismissOffset = Dimensions.get('window').height;

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <QuickEditSheet
          visible
          character={baseCharacter}
          onClose={onClose}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    const overlay = renderer!.root.findByProps({ testID: 'quick-edit-overlay' });
    await act(async () => {
      overlay.props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);

    const overlayBackdropBeforeClose = renderer!.root.findByProps({ testID: 'quick-edit-overlay-backdrop' });
    expect(overlayBackdropBeforeClose.props.style[1].opacity).toBeDefined();

    const sheetBeforeClose = renderer!.root.findByProps({ testID: 'quick-edit-sheet' });
    const translateYBeforeClose = sheetBeforeClose.props.style[2].transform[0].translateY;
    expect(translateYBeforeClose.__getValue()).toBe(dismissOffset);

    await act(async () => {
      renderer!.update(
        <QuickEditSheet
          visible={false}
          character={baseCharacter}
          onClose={onClose}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    const sheetAfterClose = renderer!.root.findByProps({ testID: 'quick-edit-sheet' });
    const translateYAfterClose = sheetAfterClose.props.style[2].transform[0].translateY;
    expect(translateYAfterClose.__getValue()).toBe(dismissOffset);

    const overlayBackdropAfterClose = renderer!.root.findByProps({ testID: 'quick-edit-overlay-backdrop' });
    expect(overlayBackdropAfterClose.props.style[1].opacity).toBeDefined();
  });

  it('shows the overlay immediately when reopening after a dismiss', async () => {
    const onClose = vi.fn();

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <QuickEditSheet
          visible
          character={baseCharacter}
          onClose={onClose}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    const overlay = renderer!.root.findByProps({ testID: 'quick-edit-overlay' });
    await act(async () => {
      overlay.props.onPress();
    });

    await act(async () => {
      renderer!.update(
        <QuickEditSheet
          visible={false}
          character={baseCharacter}
          onClose={onClose}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    await act(async () => {
      renderer!.update(
        <QuickEditSheet
          visible
          character={baseCharacter}
          onClose={onClose}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    const overlayBackdrop = renderer!.root.findByProps({ testID: 'quick-edit-overlay-backdrop' });
    expect(overlayBackdrop.props.style[1].opacity).toBe(1);
  });

  it('dismisses the quick sheet before opening the full edit modal', async () => {
    const onOpenFullEdit = vi.fn();

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <QuickEditSheet
          visible
          character={baseCharacter}
          onClose={vi.fn()}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={onOpenFullEdit}
          hasErrorFlash={false}
        />
      );
    });

    const buttons = renderer!.root.findAllByType(TouchableOpacity);
    const editMoreButton = buttons[4];

    await act(async () => {
      editMoreButton.props.onPress();
    });

    expect(onOpenFullEdit).toHaveBeenCalledTimes(1);
  });

  it('renders a 60% bottom sheet, keeps larger centered actions, and applies floor zero on steppers', async () => {
    const onSave = vi.fn(async () => undefined);

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <QuickEditSheet
          visible
          character={baseCharacter}
          onClose={vi.fn()}
          onSave={onSave}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    const sheet = renderer!.root.findByProps({ testID: 'quick-edit-sheet' });
    expect(sheet.props.style[0].height).toBe('60%');

    const buttons = renderer!.root.findAllByType(TouchableOpacity);
    const editMoreButton = buttons[4];
    const saveButton = buttons[5];

    expect(editMoreButton.props.style.width).toBe('100%');
    expect(editMoreButton.props.style.maxWidth).toBe(280);
    expect(saveButton.props.style.minHeight).toBe(56);

    await act(async () => {
      buttons[0].props.onPress();
    });

    expect(mockImpactAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      buttons[0].props.onPress();
      buttons[0].props.onPress();
      buttons[0].props.onPress();
      buttons[0].props.onPress();
      buttons[0].props.onPress();
    });

    await act(async () => {
      saveButton.props.onPress();
    });

    expect(onSave).toHaveBeenCalledWith({ level: 0, power: 3 });
  });
});
