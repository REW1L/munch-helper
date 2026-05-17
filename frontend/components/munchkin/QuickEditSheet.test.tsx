import { Character } from '@/api/characters';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions, TouchableOpacity } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  vi.fn((animations: { start: (callback?: (result: { finished: boolean }) => void) => void }[]) => ({
    start: (callback?: (result: { finished: boolean }) => void) => {
      animations.forEach((animation) => animation.start());
      callback?.({ finished: true });
    },
  }))
);
const mockReduceMotionSubscriptionRemove = vi.hoisted(() => vi.fn());
const mockReduceMotionSubscription = vi.hoisted(
  () => ({ remove: mockReduceMotionSubscriptionRemove }) as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>
);
const mockPanResponderCreate = vi.hoisted(() =>
  vi.fn(
    (config: {
      onStartShouldSetPanResponder?: (...args: unknown[]) => unknown;
      onStartShouldSetPanResponderCapture?: (...args: unknown[]) => unknown;
      onMoveShouldSetPanResponder?: (...args: unknown[]) => unknown;
      onMoveShouldSetPanResponderCapture?: (...args: unknown[]) => unknown;
      onPanResponderMove?: (...args: unknown[]) => unknown;
      onPanResponderRelease?: (...args: unknown[]) => unknown;
      onPanResponderTerminate?: (...args: unknown[]) => unknown;
    }) => ({
      panHandlers: {
        onStartShouldSetResponder: config.onStartShouldSetPanResponder,
        onStartShouldSetResponderCapture: config.onStartShouldSetPanResponderCapture,
        onMoveShouldSetResponder: config.onMoveShouldSetPanResponder,
        onMoveShouldSetResponderCapture: config.onMoveShouldSetPanResponderCapture,
        onResponderMove: config.onPanResponderMove,
        onResponderRelease: config.onPanResponderRelease,
        onResponderTerminate: config.onPanResponderTerminate,
      },
    })
  )
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
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      isReduceMotionEnabled: vi.fn().mockResolvedValue(false),
      addEventListener: vi.fn(() => mockReduceMotionSubscription),
    },
    PanResponder: {
      ...actual.PanResponder,
      create: mockPanResponderCreate,
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
  beforeEach(() => {
    mockImpactAsync.mockClear();
    mockAnimatedTiming.mockClear();
    mockAnimatedParallel.mockClear();
    mockPanResponderCreate.mockClear();
    mockReduceMotionSubscriptionRemove.mockClear();
    vi.mocked(AccessibilityInfo.addEventListener).mockClear();
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
    vi.mocked(AccessibilityInfo.addEventListener).mockReturnValue(mockReduceMotionSubscription);
  });

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

  it('snaps open and closed without animation when reduced motion is enabled', async () => {
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
    const dismissOffset = Dimensions.get('window').height;

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <QuickEditSheet
          visible={false}
          character={baseCharacter}
          onClose={vi.fn()}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    mockAnimatedTiming.mockClear();
    mockAnimatedParallel.mockClear();

    await act(async () => {
      renderer!.update(
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

    const sheetOpen = renderer!.root.findByProps({ testID: 'quick-edit-sheet' });
    const translateYOpen = sheetOpen.props.style[2].transform[0].translateY;
    const overlayBackdropOpen = renderer!.root.findByProps({ testID: 'quick-edit-overlay-backdrop' });

    expect(translateYOpen.__getValue()).toBe(0);
    expect(overlayBackdropOpen.props.style[1].opacity).toBe(1);
    expect(mockAnimatedTiming).not.toHaveBeenCalled();
    expect(mockAnimatedParallel).not.toHaveBeenCalled();

    await act(async () => {
      renderer!.update(
        <QuickEditSheet
          visible={false}
          character={baseCharacter}
          onClose={vi.fn()}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    const sheetClosed = renderer!.root.findByProps({ testID: 'quick-edit-sheet' });
    const translateYClosed = sheetClosed.props.style[2].transform[0].translateY;

    expect(translateYClosed.__getValue()).toBe(dismissOffset);
    expect(mockAnimatedTiming).not.toHaveBeenCalled();
    expect(mockAnimatedParallel).not.toHaveBeenCalled();
  });

  it('keeps the default animated transition path when reduced motion is disabled', async () => {
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <QuickEditSheet
          visible={false}
          character={baseCharacter}
          onClose={vi.fn()}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={vi.fn()}
          hasErrorFlash={false}
        />
      );
    });

    mockAnimatedTiming.mockClear();
    mockAnimatedParallel.mockClear();

    await act(async () => {
      renderer!.update(
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

    expect(mockAnimatedParallel).toHaveBeenCalledTimes(1);
    expect(mockAnimatedTiming).toHaveBeenCalledTimes(2);
    expect(mockAnimatedTiming).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ toValue: 0, duration: 180, useNativeDriver: true })
    );
    expect(mockAnimatedTiming).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ toValue: 1, duration: 120, useNativeDriver: true })
    );
  });

  it('dismisses before opening full edit when reduced motion is enabled', async () => {
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
    const onOpenFullEdit = vi.fn();

    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(
        <QuickEditSheet
          visible={false}
          character={baseCharacter}
          onClose={vi.fn()}
          onSave={vi.fn(async () => undefined)}
          onOpenFullEdit={onOpenFullEdit}
          hasErrorFlash={false}
        />
      );
    });

    await act(async () => {
      renderer!.update(
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

    const sheet = renderer!.root.findByProps({ testID: 'quick-edit-sheet' });
    const translateY = sheet.props.style[2].transform[0].translateY;

    expect(translateY.__getValue()).toBe(Dimensions.get('window').height);
    expect(onOpenFullEdit).toHaveBeenCalledTimes(1);
  });

  it('snaps a reduced-motion drag release back open without animation', async () => {
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);

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

    mockAnimatedTiming.mockClear();
    mockAnimatedParallel.mockClear();

    const dragArea = renderer!.root.findByProps({ testID: 'quick-edit-drag-area' });
    const sheet = renderer!.root.findByProps({ testID: 'quick-edit-sheet' });
    const translateY = sheet.props.style[2].transform[0].translateY;

    await act(async () => {
      dragArea.props.onResponderMove({}, { dx: 0, dy: 80 });
      dragArea.props.onResponderRelease({}, { dy: 80, vy: 0.2 });
    });

    expect(translateY.__getValue()).toBe(0);
    expect(mockAnimatedTiming).not.toHaveBeenCalled();
    expect(mockAnimatedParallel).not.toHaveBeenCalled();
  });

  it('keeps reduced-motion drag dismiss routed through close without animation', async () => {
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
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

    mockAnimatedTiming.mockClear();
    mockAnimatedParallel.mockClear();

    const dragArea = renderer!.root.findByProps({ testID: 'quick-edit-drag-area' });

    await act(async () => {
      dragArea.props.onResponderRelease({}, { dy: 140, vy: 0.2 });
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockAnimatedTiming).not.toHaveBeenCalled();
    expect(mockAnimatedParallel).not.toHaveBeenCalled();
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
