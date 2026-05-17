import { AppTheme } from '@/constants/theme';
import React from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReconnectingBanner from './ReconnectingBanner';

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    ...actual,
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      announceForAccessibility: vi.fn(),
    },
  };
});

function getTextNode(renderer: any, text: string) {
  return renderer.root.find((node: { props?: { children?: unknown } }) => node.props?.children === text);
}

describe('ReconnectingBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when hidden', () => {
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(<ReconnectingBanner visible={false} />);
    });

    expect(renderer.toJSON()).toBeNull();
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('renders reconnecting text with token styles when visible', () => {
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(<ReconnectingBanner visible />);
    });

    const banner = renderer.root.findByType(View);
    const label = getTextNode(renderer, 'Reconnecting…');
    const bannerStyle = StyleSheet.flatten(banner.props.style);
    const labelStyle = StyleSheet.flatten(label.props.style);

    expect(bannerStyle.backgroundColor).toBe(AppTheme.colors.surfaceSubtle);
    expect(labelStyle.color).toBe(AppTheme.colors.textMuted);
    expect(labelStyle.textAlign).toBe('center');
    expect(label.type).toBe(Text);
  });

  it('announces exactly once while the same visible banner remains mounted', () => {
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(<ReconnectingBanner visible />);
    });

    act(() => {
      renderer.update(<ReconnectingBanner visible />);
    });

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Reconnecting…');
  });

  it('announces when the banner transitions from hidden to visible', () => {
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(<ReconnectingBanner visible={false} />);
    });
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();

    act(() => {
      renderer.update(<ReconnectingBanner visible />);
    });

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Reconnecting…');
  });
});
