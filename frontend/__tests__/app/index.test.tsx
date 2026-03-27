import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockOpenURL = vi.hoisted(() => vi.fn());
const mockCanOpenURL = vi.hoisted(() => vi.fn());

vi.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  router: {
    navigate: mockNavigate,
  },
}));

vi.mock('react-native-safe-area-context', async () => {
  const ReactRuntime = await import('react');

  return {
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      ReactRuntime.createElement(ReactRuntime.Fragment, null, children),
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
      ReactRuntime.createElement('div', props, children),
  };
});

vi.mock('expo-image', async () => {
  const ReactRuntime = await import('react');

  return {
    Image: ({
      children,
      accessibilityLabel,
      source,
      contentFit,
      ...props
    }: {
      children?: React.ReactNode;
      accessibilityLabel?: string;
      source?: unknown;
      contentFit?: string;
    } & Record<string, unknown>) =>
      ReactRuntime.createElement('img', { ...props, 'aria-label': accessibilityLabel }, children),
  };
});

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');

  return {
    ...actual,
    Linking: {
      ...actual.Linking,
      openURL: mockOpenURL,
      canOpenURL: mockCanOpenURL,
    },
  };
});

describe('Landing route', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockOpenURL.mockReset();
    mockOpenURL.mockResolvedValue(undefined);
    mockCanOpenURL.mockReset();
    mockCanOpenURL.mockResolvedValue(true);
  });

  it('renders title, purpose text, and Rooms button', async () => {
    const { default: LandingPage } = await import('../../app/index');

    await act(async () => {
      render(<LandingPage />);
    });

    expect(screen.getByText('Munch Helper')).toBeTruthy();
    expect(screen.getByText('Your companion for board games like Munchkin')).toBeTruthy();
    expect(screen.getByText('Rooms')).toBeTruthy();
  });

  it('keeps Privacy and Support actions present and tappable', async () => {
    const { default: LandingPage } = await import('../../app/index');

    await act(async () => {
      render(<LandingPage />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Privacy'));
      fireEvent.click(screen.getByText('Support'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/privacy');
    expect(mockNavigate).toHaveBeenCalledWith('/support');
  });

  it('opens configured App Store URL from store link', async () => {
    const { default: LandingPage } = await import('../../app/index');

    await act(async () => {
      render(<LandingPage />);
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('App Store'));
    });

    expect(mockCanOpenURL).toHaveBeenCalledWith('https://apps.apple.com/us/app/munch-helper/id6760627502');
    expect(mockOpenURL).toHaveBeenCalledWith('https://apps.apple.com/us/app/munch-helper/id6760627502');
  });

  it('renders disabled Google Play link and does not trigger URL action', async () => {
    const { default: LandingPage } = await import('../../app/index');

    await act(async () => {
      render(<LandingPage />);
    });

    const googlePlayButton = screen.getByLabelText('Google Play');
    expect(googlePlayButton.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('soon')).toBeTruthy();

    await act(async () => {
      fireEvent.click(googlePlayButton);
    });

    expect(mockOpenURL).not.toHaveBeenCalled();
    expect(mockCanOpenURL).not.toHaveBeenCalled();
  });

  it('navigates to /rooms when Rooms is tapped', async () => {
    const { default: LandingPage } = await import('../../app/index');

    await act(async () => {
      render(<LandingPage />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Rooms'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/rooms');
  });
});
