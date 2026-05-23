import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockOpenURL = vi.hoisted(() => vi.fn());
const mockPlatformOS = vi.hoisted(() => ({ value: 'web' }));

vi.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

vi.mock('react-native-safe-area-context', async () => {
  const ReactRuntime = await import('react');

  return {
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      ReactRuntime.createElement(ReactRuntime.Fragment, null, children),
    SafeAreaView: ({ children, edges, ...props }: { children?: React.ReactNode; edges?: string[] } & Record<string, unknown>) =>
      ReactRuntime.createElement('div', { ...props, 'data-testid': 'safe-area', 'data-edges': JSON.stringify(edges) }, children),
  };
});

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');

  return {
    ...actual,
    Platform: {
      ...actual.Platform,
      get OS() {
        return mockPlatformOS.value;
      },
    },
    Linking: {
      ...actual.Linking,
      openURL: mockOpenURL,
    },
  };
});

describe('Support route', () => {
  beforeEach(() => {
    vi.resetModules();
    mockPlatformOS.value = 'web';
    mockOpenURL.mockReset();
    mockOpenURL.mockResolvedValue(undefined);
  });

  it('renders the title, current feature scope, and contact email', async () => {
    const [{ SUPPORT_EMAIL }, { default: SupportPage }] = await Promise.all([
      import('../../constants/releaseContent'),
      import('../../app/support'),
    ]);

    await act(async () => {
      render(<SupportPage />);
    });

    expect(screen.getByText('Support')).toBeTruthy();
    expect(screen.getByText(/rooms, characters, battles, or room history/i)).toBeTruthy();
    expect(screen.getByText(SUPPORT_EMAIL)).toBeTruthy();
  });

  it('opens a mailto link when the contact email is tapped', async () => {
    const [{ SUPPORT_EMAIL }, { default: SupportPage }] = await Promise.all([
      import('../../constants/releaseContent'),
      import('../../app/support'),
    ]);

    await act(async () => {
      render(<SupportPage />);
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText(`Email support at ${SUPPORT_EMAIL}`));
    });

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL).toHaveBeenCalledWith(`mailto:${SUPPORT_EMAIL}`);
  });

  it('survives a Linking.openURL rejection without crashing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockOpenURL.mockReset();
    mockOpenURL.mockRejectedValue(new Error('no mail handler'));

    const [{ SUPPORT_EMAIL }, { default: SupportPage }] = await Promise.all([
      import('../../constants/releaseContent'),
      import('../../app/support'),
    ]);

    await act(async () => {
      render(<SupportPage />);
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText(`Email support at ${SUPPORT_EMAIL}`));
    });

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Support')).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('preserves iOS safe-area edges (no double inset under Stack header)', async () => {
    mockPlatformOS.value = 'ios';
    const { default: SupportPage } = await import('../../app/support');

    await act(async () => {
      render(<SupportPage />);
    });

    expect(screen.getByTestId('safe-area').getAttribute('data-edges')).toBe('[]');
  });

  it('preserves Android safe-area edges for native rendering', async () => {
    mockPlatformOS.value = 'android';
    const { default: SupportPage } = await import('../../app/support');

    await act(async () => {
      render(<SupportPage />);
    });

    expect(screen.getByTestId('safe-area').getAttribute('data-edges')).toBe('["top","bottom","left","right"]');
  });
});
