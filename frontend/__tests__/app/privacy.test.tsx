import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  };
});

describe('Privacy route', () => {
  beforeEach(() => {
    vi.resetModules();
    mockPlatformOS.value = 'web';
  });

  it('renders the title and current effective date', async () => {
    const { EFFECTIVE_DATE, default: PrivacyPolicyPage } = await import('../../app/privacy');

    await act(async () => {
      render(<PrivacyPolicyPage />);
    });

    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText(`Effective date: ${EFFECTIVE_DATE}`)).toBeTruthy();
  });

  it('explains anonymous identity without account credentials', async () => {
    const { default: PrivacyPolicyPage } = await import('../../app/privacy');

    await act(async () => {
      render(<PrivacyPolicyPage />);
    });

    expect(
      screen.getByText(/does not require sign-up, account creation, email, password, or any third-party identity provider/i)
    ).toBeTruthy();
    expect(screen.getByText(/server-assigned user identifier/i)).toBeTruthy();
  });

  it('describes room participation and real-time shared state within a room', async () => {
    const { default: PrivacyPolicyPage } = await import('../../app/privacy');

    await act(async () => {
      render(<PrivacyPolicyPage />);
    });

    expect(screen.getByText(/visible to other players in that same room/i)).toBeTruthy();
    expect(screen.getByText(/room, battle, and room history log state is shared in real time/i)).toBeTruthy();
  });

  it('uses the shared support email constant for privacy contact text', async () => {
    const [{ SUPPORT_EMAIL }, { default: PrivacyPolicyPage }] = await Promise.all([
      import('../../constants/releaseContent'),
      import('../../app/privacy'),
    ]);

    await act(async () => {
      render(<PrivacyPolicyPage />);
    });

    expect(screen.getByText(new RegExp(SUPPORT_EMAIL))).toBeTruthy();
  });

  it('preserves platform-specific safe-area edge behavior', async () => {
    mockPlatformOS.value = 'ios';
    const { default: PrivacyPolicyPage } = await import('../../app/privacy');

    await act(async () => {
      render(<PrivacyPolicyPage />);
    });

    expect(screen.getByTestId('safe-area').getAttribute('data-edges')).toBe('[]');
  });
});
