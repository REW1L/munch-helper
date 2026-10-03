import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';

const mockOpenURL = vi.hoisted(() => vi.fn());

vi.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

vi.mock('react-native-safe-area-context', async () => {
  const ReactRuntime = await import('react');

  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
      ReactRuntime.createElement('div', props, children),
  };
});

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');

  return {
    ...actual,
    Linking: {
      ...actual.Linking,
      openURL: mockOpenURL,
    },
  };
});

const OFFICIAL_RULES_URL =
  'https://munchkin.game/site-munchkin/assets/files/1138/munchkin_rules-1.pdf';

const EXPECTED_HEADINGS = [
  'Goal and victory',
  'Setup',
  'Turn sequence',
  'Characters and cards',
  'Combat',
  'Items and trading',
  'Asking for help',
  'Running away and death',
  'Curses',
  'Cards and general rules',
];

describe('Munchkin rules route', () => {
  beforeEach(async () => {
    mockOpenURL.mockReset();
    mockOpenURL.mockResolvedValue(undefined);
    await i18n.changeLanguage('en');
  });

  it('renders a scrollable, structured summary with accessible headings', async () => {
    const { default: MunchkinRulesPage } = await import('../../../app/munchkin/rules');

    await act(async () => {
      render(<MunchkinRulesPage />);
    });

    expect(screen.getByRole('heading', { name: 'Munchkin Classic Rules', level: 1 })).toBeTruthy();
    expect(screen.getByText(/competitive card game/i)).toBeTruthy();
    expect(screen.getByText(/original summary/i)).toBeTruthy();
    expect(screen.getByTestId('munchkin-rules-scroll')).toBeTruthy();

    const sourceHeading = screen.getByRole('heading', {
      name: 'Source and complete rules',
      level: 2,
    });
    const firstRuleHeading = screen.getByRole('heading', { name: 'Goal and victory', level: 2 });
    expect(sourceHeading.compareDocumentPosition(firstRuleHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    for (const heading of EXPECTED_HEADINGS) {
      expect(screen.getByRole('heading', { name: heading, level: 2 })).toBeTruthy();
    }
  });

  it('opens the official rulebook from an accessible source link', async () => {
    const { default: MunchkinRulesPage } = await import('../../../app/munchkin/rules');

    await act(async () => {
      render(<MunchkinRulesPage />);
    });

    const sourceLink = screen.getByRole('link', {
      name: 'Open the official Munchkin Classic rulebook PDF',
    });
    expect(sourceLink.textContent).toContain('Official Munchkin Classic rulebook (PDF)');

    await act(async () => {
      fireEvent.click(sourceLink);
    });

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL).toHaveBeenCalledWith(OFFICIAL_RULES_URL);
  });

  it('stays usable when the platform rejects the official source link', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockOpenURL.mockRejectedValue(new Error('no PDF handler'));
    const { default: MunchkinRulesPage } = await import('../../../app/munchkin/rules');

    await act(async () => {
      render(<MunchkinRulesPage />);
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole('link', {
          name: 'Open the official Munchkin Classic rulebook PDF',
        })
      );
    });

    expect(screen.getByRole('heading', { name: 'Munchkin Classic Rules', level: 1 })).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('keeps long localized content reachable and semantic at 320px', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    await i18n.changeLanguage('de');
    const { default: MunchkinRulesPage } = await import('../../../app/munchkin/rules');

    await act(async () => {
      render(<MunchkinRulesPage />);
    });

    const scrollView = screen.getByTestId('munchkin-rules-scroll');
    const sourceLink = screen.getByRole('link', {
      name: 'Öffnen Sie das offizielle Munchkin Classic-Regelbuch im PDF-Format',
    });

    expect(screen.getByRole('heading', { name: 'Munchkin-Klassiker-Regeln', level: 1 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Karten und allgemeine Regeln', level: 2 })).toBeTruthy();
    expect(scrollView.contains(sourceLink)).toBe(true);
  });
});
