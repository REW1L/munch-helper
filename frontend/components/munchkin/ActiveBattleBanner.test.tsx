import { AppTheme } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import ActiveBattleBanner from './ActiveBattleBanner';

function renderBanner(battleName?: string | null, onViewBattle = vi.fn()) {
  let renderer: any;

  act(() => {
    renderer = TestRenderer.create(
      <ActiveBattleBanner battleName={battleName} onViewBattle={onViewBattle} />
    );
  });

  return { renderer: renderer!, onViewBattle };
}

function findTextNode(renderer: any, text: string) {
  return renderer.root.find((node: { props?: { children?: unknown } }) => node.props?.children === text);
}

describe('ActiveBattleBanner', () => {
  it('renders the provided battle name inside a single accessible button', () => {
    const { renderer } = renderBanner('Dungeon Door');

    const banner = renderer.root.findByProps({ testID: 'active-battle-banner' });

    expect(banner.type).toBe(Pressable);
    expect(banner.props.accessible).toBe(true);
    expect(banner.props.accessibilityRole).toBe('button');
    expect(banner.props.accessibilityLabel).toBe('Battle in progress. Tap to view.');
    expect(findTextNode(renderer, '⚔️')).toBeTruthy();
    expect(findTextNode(renderer, 'Dungeon Door')).toBeTruthy();
    expect(findTextNode(renderer, 'View Battle →')).toBeTruthy();
  });

  it.each([undefined, null, '', '   '])('falls back when battleName is %s', (battleName) => {
    const { renderer } = renderBanner(battleName);

    expect(findTextNode(renderer, 'Battle in progress')).toBeTruthy();
  });

  it('calls onViewBattle once when pressed', () => {
    const onViewBattle = vi.fn();
    const { renderer } = renderBanner('Dungeon Door', onViewBattle);

    act(() => {
      renderer.root.findByProps({ testID: 'active-battle-banner' }).props.onPress();
    });

    expect(onViewBattle).toHaveBeenCalledTimes(1);
  });

  it('uses AppTheme tokens for banner color and text', () => {
    const { renderer } = renderBanner('Dungeon Door');
    const banner = renderer.root.findByProps({ testID: 'active-battle-banner' });
    const bannerStyle = StyleSheet.flatten(banner.props.style({ pressed: false }));
    const labelStyle = StyleSheet.flatten(findTextNode(renderer, 'Dungeon Door').props.style);
    const actionStyle = StyleSheet.flatten(findTextNode(renderer, 'View Battle →').props.style);

    expect(bannerStyle.backgroundColor).toBe(AppTheme.colors.danger);
    expect(bannerStyle.borderRadius).toBe(AppTheme.radius.md);
    expect(labelStyle.color).toBe(AppTheme.colors.textPrimary);
    expect(actionStyle.color).toBe(AppTheme.colors.textPrimary);
    expect(renderer.root.findAllByType(Pressable)).toHaveLength(1);
    expect(renderer.root.findAllByType(Text).map((node: any) => node.props.children)).toEqual([
      '⚔️',
      'Dungeon Door',
      'View Battle →',
    ]);
  });
});
