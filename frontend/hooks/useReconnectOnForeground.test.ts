import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';
type AppStateListener = (state: AppStateStatus) => void;

const appStateMock = vi.hoisted(() => ({
  currentState: 'active' as AppStateStatus,
  listener: null as AppStateListener | null,
  remove: vi.fn(),
}));

vi.mock('react-native', () => ({
  AppState: {
    get currentState() {
      return appStateMock.currentState;
    },
    addEventListener: vi.fn((_event: 'change', listener: AppStateListener) => {
      appStateMock.listener = listener;
      return { remove: appStateMock.remove };
    }),
  },
}));

import { AppState } from 'react-native';
import { useReconnectOnForeground } from './useReconnectOnForeground';

describe('useReconnectOnForeground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appStateMock.currentState = 'active';
    appStateMock.listener = null;
  });

  afterEach(() => {
    appStateMock.listener = null;
  });

  it('triggers reconnect when the app returns to active from background', () => {
    const onForeground = vi.fn();

    renderHook(() => useReconnectOnForeground(true, onForeground));

    appStateMock.listener?.('background');
    expect(onForeground).not.toHaveBeenCalled();

    appStateMock.listener?.('active');
    expect(onForeground).toHaveBeenCalledTimes(1);
  });

  it('does not trigger reconnect for non-active transitions', () => {
    const onForeground = vi.fn();

    renderHook(() => useReconnectOnForeground(true, onForeground));

    appStateMock.listener?.('inactive');
    appStateMock.listener?.('background');

    expect(onForeground).not.toHaveBeenCalled();
  });

  it('does not reconnect when already connected', () => {
    const onForeground = vi.fn();

    renderHook(() => useReconnectOnForeground(false, onForeground));

    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    appStateMock.listener?.('background');
    appStateMock.listener?.('active');
    expect(onForeground).not.toHaveBeenCalled();
  });

  it('tracks background transitions while disabled so later foreground reconnect is not missed', () => {
    const onForeground = vi.fn();
    const { rerender } = renderHook(({ enabled }) => useReconnectOnForeground(enabled, onForeground), {
      initialProps: { enabled: false },
    });

    appStateMock.listener?.('background');
    rerender({ enabled: true });
    appStateMock.listener?.('active');

    expect(onForeground).toHaveBeenCalledTimes(1);
  });
});
