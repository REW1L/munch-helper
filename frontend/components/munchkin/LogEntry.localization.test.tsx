import type { LogEvent } from '@/api/logs';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLocale = vi.hoisted(() => ({ value: 'en' as 'en' | 'lt' }));

vi.mock('@/constants/avatars', () => ({
  default: Array.from({ length: 10 }, (_, index) => index + 1),
}));

vi.mock('@/i18n', async () => {
  const actual = await vi.importActual<typeof import('@/i18n')>('@/i18n');
  return {
    ...actual,
    useLocalization: () => ({
      locale: mockLocale.value,
      localeOptions: actual.LOCALE_INFOS,
      setLocale: vi.fn(),
      t: (key: Parameters<typeof actual.translate>[1], values?: Parameters<typeof actual.translate>[2]) =>
        actual.translate(mockLocale.value, key, values),
    }),
  };
});

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    ...actual,
    Image: 'Image',
  };
});

vi.mock('./logEntryTime', () => ({
  formatRelativeTime: vi.fn(() => '3m ago'),
}));

describe('LogEntry localization', () => {
  beforeEach(() => {
    mockLocale.value = 'en';
  });

  it('renders the same structured battle-started event in the active language', async () => {
    const { default: LogEntry } = await import('./LogEntry');
    const entry: LogEvent = {
      id: 'log-1',
      roomId: 'room-1',
      eventType: 'battle_started',
      actorId: 'user-1',
      summary: 'Battle started',
      payload: {
        battle: {
          id: 'battle-1',
          name: 'Cave Dragon',
        },
      },
      occurredAt: '2026-05-21T11:57:00.000Z',
    };

    let englishRenderer: any;
    act(() => {
      englishRenderer = TestRenderer.create(<LogEntry entry={entry} />);
    });
    expect(englishRenderer!.root.findByProps({ testID: 'log-entry-row' }).props.accessibilityLabel)
      .toBe('Battle Cave Dragon, started, 3m ago.');

    mockLocale.value = 'lt';
    let lithuanianRenderer: any;
    act(() => {
      lithuanianRenderer = TestRenderer.create(<LogEntry entry={entry} />);
    });
    expect(lithuanianRenderer!.root.findByProps({ testID: 'log-entry-row' }).props.accessibilityLabel)
      .toBe('Mūšis Cave Dragon, pradėtas, 3m ago.');
  });
});
