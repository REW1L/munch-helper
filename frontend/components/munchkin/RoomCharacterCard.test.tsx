import { Character } from '@/api/characters';
import { AppTheme } from '@/constants/theme';
import React from 'react';
import { AccessibilityInfo, Animated, ScrollView, StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AttributeList from './AttributeList';
import CurrentCharacterFooter from './CurrentCharacterFooter';
import RoomCharacterCard from './RoomCharacterCard';

vi.mock('@/constants/avatars', () => ({
  default: Array.from({ length: 10 }, () => 1),
}));

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    ...actual,
    Image: 'Image',
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      isReduceMotionEnabled: vi.fn().mockResolvedValue(false),
      addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    },
  };
});

const baseCharacter: Character = {
  id: 'char-1',
  roomId: 'room-1',
  userId: 'user-1',
  nickname: 'Thorin',
  avatar: 0,
  color: '#AABBCC',
  level: 5,
  power: 3,
  class: ['Warrior'],
  race: ['Dwarf'],
  gender: ['Male'],
};

function getTextNode(renderer: any, text: string) {
  return renderer.root.find((node: { props?: { children?: unknown } }) => {
    const children = node.props?.children;
    if (typeof children === 'string') {
      return children === text;
    }

    if (Array.isArray(children)) {
      return children.join('') === text;
    }

    return false;
  });
}

describe('RoomCharacterCard', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
  });

  it('supports full-card press with accessibility label and hint', () => {
    const onChangePress = vi.fn();
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<RoomCharacterCard character={baseCharacter} onChangePress={onChangePress} />);
    });
    const cardButton = renderer.root.findByProps({
      accessibilityLabel: 'Thorin, Level 5, Power 3',
    });

    act(() => {
      cardButton.props.onPress();
    });

    expect(onChangePress).toHaveBeenCalledTimes(1);
    expect(onChangePress).toHaveBeenCalledWith(baseCharacter);
    expect(cardButton.props.accessibilityHint).toBe('Tap to edit stats');
  });

  it('shows visual press feedback on the tappable card body', () => {
    const onChangePress = vi.fn();
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<RoomCharacterCard character={baseCharacter} onChangePress={onChangePress} />);
    });

    const cardButton = renderer.root.findByProps({
      accessibilityLabel: 'Thorin, Level 5, Power 3',
    });
    const baseStyle = StyleSheet.flatten(cardButton.props.style({ pressed: false }));
    const pressedStyle = StyleSheet.flatten(cardButton.props.style({ pressed: true }));

    expect(baseStyle.opacity).toBeUndefined();
    expect(pressedStyle.opacity).toBe(0.72);
  });

  it('keeps the existing Change button wired to the same edit callback seam', () => {
    const onChangePress = vi.fn();
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<RoomCharacterCard character={baseCharacter} onChangePress={onChangePress} />);
    });

    const changeButton = renderer.root.findByProps({ title: 'Change' });

    act(() => {
      changeButton.props.onPress();
    });

    expect(onChangePress).toHaveBeenCalledTimes(1);
    expect(onChangePress).toHaveBeenCalledWith(baseCharacter);
  });

  it('uses token colors for card and footer name/stat text', () => {
    const noop = vi.fn();
    let cardRenderer: any;
    act(() => {
      cardRenderer = TestRenderer.create(<RoomCharacterCard character={baseCharacter} onChangePress={noop} />);
    });

    const cardNameStyle = StyleSheet.flatten(getTextNode(cardRenderer, 'Thorin').props.style);
    const cardLevelStyle = StyleSheet.flatten(getTextNode(cardRenderer, '5 lvl').props.style);
    const cardPowerStyle = StyleSheet.flatten(getTextNode(cardRenderer, '3 str').props.style);

    expect(cardNameStyle.color).toBe(AppTheme.colors.textAccentSoft);
    expect(cardLevelStyle.color).toBe(AppTheme.colors.accent);
    expect(cardPowerStyle.color).toBe(AppTheme.colors.accent);

    let footerRenderer: any;
    act(() => {
      footerRenderer = TestRenderer.create(<CurrentCharacterFooter character={baseCharacter} onChangePress={noop} />);
    });
    const footerNameStyle = StyleSheet.flatten(getTextNode(footerRenderer, 'Thorin').props.style);
    const footerLevelStyle = StyleSheet.flatten(getTextNode(footerRenderer, '5 lvl').props.style);
    const footerPowerStyle = StyleSheet.flatten(getTextNode(footerRenderer, '3 str').props.style);

    expect(footerNameStyle.color).toBe(AppTheme.colors.textAccentSoft);
    expect(footerLevelStyle.color).toBe(AppTheme.colors.accent);
    expect(footerPowerStyle.color).toBe(AppTheme.colors.accent);
  });

  it('uses token-based text color in shared AttributeList for card and footer variants', () => {
    let cardRenderer: any;
    act(() => {
      cardRenderer = TestRenderer.create(<AttributeList character={baseCharacter} variant="card" />);
    });
    const cardAttributeStyle = StyleSheet.flatten(getTextNode(cardRenderer, 'Dwarf').props.style);
    expect(cardAttributeStyle.color).toBe(AppTheme.colors.textPrimary);

    let footerRenderer: any;
    act(() => {
      footerRenderer = TestRenderer.create(<AttributeList character={baseCharacter} variant="footer" />);
    });
    const footerAttributeStyle = StyleSheet.flatten(getTextNode(footerRenderer, 'Dwarf').props.style);
    expect(footerAttributeStyle.color).toBe(AppTheme.colors.textPrimary);
  });

  it('keeps attribute lists scrollable inside the tappable card and footer containers', () => {
    const noop = vi.fn();
    let cardRenderer: any;
    act(() => {
      cardRenderer = TestRenderer.create(<RoomCharacterCard character={baseCharacter} onChangePress={noop} />);
    });

    const cardButton = cardRenderer.root.findByProps({
      accessibilityLabel: 'Thorin, Level 5, Power 3',
    });
    const [cardScrollView] = cardRenderer.root.findAllByType(ScrollView);
    expect(cardScrollView.props.nestedScrollEnabled).toBe(true);
    expect(cardScrollView.props.showsVerticalScrollIndicator).toBe(false);
    expect(cardButton.findAllByType(ScrollView)).toHaveLength(0);

    let footerRenderer: any;
    act(() => {
      footerRenderer = TestRenderer.create(<CurrentCharacterFooter character={baseCharacter} onChangePress={noop} />);
    });

    const [footerScrollView] = footerRenderer.root.findAllByType(ScrollView);
    expect(footerScrollView.props.nestedScrollEnabled).toBe(true);
    expect(footerScrollView.props.showsVerticalScrollIndicator).toBe(false);
  });

  it('shows reduced-motion realtime border signal when an external update arrives', async () => {
    vi.useFakeTimers();
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
    const onChangePress = vi.fn();
    const timeoutSpy = vi.spyOn(global, 'setTimeout');
    let renderer: any;

    await act(async () => {
      renderer = TestRenderer.create(
        <RoomCharacterCard character={baseCharacter} onChangePress={onChangePress} realtimeFlashSignal={0} />
      );
    });

    await act(async () => {
      renderer.update(
        <RoomCharacterCard character={baseCharacter} onChangePress={onChangePress} realtimeFlashSignal={1} />
      );
    });

    const cardContainer = renderer.root.findByType(Animated.View);
    const flashStyle = StyleSheet.flatten(cardContainer.props.style);

    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 700);
    expect(flashStyle.borderWidth).toBe(3);
  });

  it('waits for reduced-motion preference resolution before processing the first realtime signal', async () => {
    vi.useFakeTimers();
    let resolveReducedMotion!: (value: boolean) => void;
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveReducedMotion = resolve;
        })
    );
    const timingSpy = vi.spyOn(Animated, 'timing');
    const timeoutSpy = vi.spyOn(global, 'setTimeout');
    let renderer: any;

    await act(async () => {
      renderer = TestRenderer.create(
        <RoomCharacterCard character={baseCharacter} onChangePress={vi.fn()} realtimeFlashSignal={0} />
      );
    });

    await act(async () => {
      renderer.update(
        <RoomCharacterCard character={baseCharacter} onChangePress={vi.fn()} realtimeFlashSignal={1} />
      );
    });

    expect(timingSpy).not.toHaveBeenCalled();
    expect(timeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 700);

    await act(async () => {
      resolveReducedMotion(true);
      await Promise.resolve();
    });

    expect(timingSpy).not.toHaveBeenCalled();
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 700);

    timingSpy.mockRestore();
  });

  it('supports concurrent flash animations across multiple cards', async () => {
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
    const animatedStartSpy = vi.fn();
    const timingSpy = vi.spyOn(Animated, 'timing').mockImplementation(
      () =>
      ({
        start: animatedStartSpy,
        stop: vi.fn(),
        reset: vi.fn(),
      } as unknown as Animated.CompositeAnimation)
    );

    const otherCharacter: Character = {
      ...baseCharacter,
      id: 'char-2',
      nickname: 'Balin',
      color: '#112233',
    };

    let firstRenderer: any;
    let secondRenderer: any;
    await act(async () => {
      firstRenderer = TestRenderer.create(
        <RoomCharacterCard character={baseCharacter} onChangePress={vi.fn()} realtimeFlashSignal={1} />
      );
      secondRenderer = TestRenderer.create(
        <RoomCharacterCard character={otherCharacter} onChangePress={vi.fn()} realtimeFlashSignal={1} />
      );
    });

    expect(timingSpy).toHaveBeenCalledTimes(4);
    expect(animatedStartSpy).toHaveBeenCalledTimes(4);
    expect(timingSpy).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ duration: 350 })
    );
    expect(timingSpy).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ duration: 350 })
    );

    act(() => {
      firstRenderer.unmount();
      secondRenderer.unmount();
    });
  });
});
