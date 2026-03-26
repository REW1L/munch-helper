import { act, renderHook } from '@testing-library/react';
import { StrictMode, createElement, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setStringAsync } from 'expo-clipboard';

import { COPIED_LABEL_RESET_MS, useRoomCodeClipboard } from './useRoomCodeClipboard';

vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(),
}));

const mockSetStringAsync = vi.mocked(setStringAsync);

type DeferredPromise<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferredPromise<T>(): DeferredPromise<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolve = resolveFn;
    reject = rejectFn;
  });

  return { promise, resolve, reject };
}

function StrictModeWrapper({ children }: PropsWithChildren) {
  return createElement(StrictMode, null, children);
}

describe('useRoomCodeClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSetStringAsync.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('copies current room code and resets copied state after 1500ms', async () => {
    const { result } = renderHook(() => useRoomCodeClipboard('ROOM42'));

    expect(result.current.buttonLabel).toBe('Copy');
    expect(result.current.accessibilityLabel).toBe('Copy room code ROOM42');

    await act(async () => {
      await result.current.copyRoomCode();
    });

    expect(mockSetStringAsync).toHaveBeenCalledWith('ROOM42');
    expect(result.current.buttonLabel).toBe('Copied ✓');

    act(() => {
      vi.advanceTimersByTime(COPIED_LABEL_RESET_MS);
    });

    expect(result.current.buttonLabel).toBe('Copy');
  });

  it('includes full room code in accessibility label', () => {
    const { result } = renderHook(() => useRoomCodeClipboard('ABCD12'));

    expect(result.current.accessibilityLabel).toBe('Copy room code ABCD12');
  });

  it('cleans up reset timer on unmount', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useRoomCodeClipboard('ROOM99'));

    await act(async () => {
      await result.current.copyRoomCode();
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('does not update copied state when clipboard copy fails', async () => {
    mockSetStringAsync.mockRejectedValueOnce(new Error('clipboard unavailable'));
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const { result } = renderHook(() => useRoomCodeClipboard('ROOM42'));

    await expect(result.current.copyRoomCode()).rejects.toThrow('clipboard unavailable');

    expect(result.current.buttonLabel).toBe('Copy');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('does not schedule copied-state update when unmounted before clipboard resolves', async () => {
    const deferred = createDeferredPromise<boolean>();
    mockSetStringAsync.mockReturnValueOnce(deferred.promise);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const { result, unmount } = renderHook(() => useRoomCodeClipboard('ROOM42'));

    const pendingCopy = result.current.copyRoomCode();
    unmount();
    deferred.resolve(true);

    await pendingCopy;

    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('ignores stale clipboard completion when room code changes before promise resolves', async () => {
    const deferred = createDeferredPromise<boolean>();
    mockSetStringAsync.mockReturnValueOnce(deferred.promise);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const { result, rerender, unmount } = renderHook(
      ({ code }) => useRoomCodeClipboard(code),
      {
        initialProps: {
          code: 'ROOM42',
        },
      }
    );

    const pendingCopy = result.current.copyRoomCode();
    await act(async () => {
      rerender({ code: 'ROOM77' });
    });
    deferred.resolve(true);

    await pendingCopy;

    expect(mockSetStringAsync).toHaveBeenCalledWith('ROOM42');
    expect(result.current.buttonLabel).toBe('Copy');
    expect(result.current.accessibilityLabel).toBe('Copy room code ROOM77');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('resets copied state when room code changes during copied window', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, rerender, unmount } = renderHook(
      ({ code }) => useRoomCodeClipboard(code),
      {
        initialProps: {
          code: 'ROOM42',
        },
      }
    );

    await act(async () => {
      await result.current.copyRoomCode();
    });

    expect(result.current.buttonLabel).toBe('Copied ✓');
    act(() => {
      rerender({ code: 'ROOM77' });
    });

    expect(result.current.buttonLabel).toBe('Copy');
    expect(result.current.accessibilityLabel).toBe('Copy room code ROOM77');
    expect(clearTimeoutSpy).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(COPIED_LABEL_RESET_MS);
    });

    expect(result.current.buttonLabel).toBe('Copy');
  });

  it('copies the latest room code after a room code rerender', async () => {
    const deferred = createDeferredPromise<boolean>();
    mockSetStringAsync.mockReturnValueOnce(deferred.promise);
    const { result, rerender, unmount } = renderHook(
      ({ code }) => useRoomCodeClipboard(code),
      {
        initialProps: {
          code: 'ROOM42',
        },
      }
    );

    act(() => {
      rerender({ code: 'ROOM77' });
    });

    expect(result.current.accessibilityLabel).toBe('Copy room code ROOM77');

    let pendingCopy!: Promise<void>;
    act(() => {
      pendingCopy = result.current.copyRoomCode();
    });

    expect(mockSetStringAsync).toHaveBeenLastCalledWith('ROOM77');

    await act(async () => {
      deferred.resolve(true);
      await pendingCopy;
    });

    unmount();
  });

  it('updates copied state when mounted in React StrictMode', async () => {
    const { result, unmount } = renderHook(() => useRoomCodeClipboard('ROOM42'), {
      wrapper: StrictModeWrapper,
    });

    await act(async () => {
      await result.current.copyRoomCode();
    });

    expect(mockSetStringAsync).toHaveBeenCalledWith('ROOM42');
    expect(result.current.buttonLabel).toBe('Copied ✓');
    unmount();
  });
});
