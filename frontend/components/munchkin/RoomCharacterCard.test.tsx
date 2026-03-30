import { Character } from '@/api/characters';
import { AppTheme } from '@/constants/theme';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ScrollView, StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

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
});
