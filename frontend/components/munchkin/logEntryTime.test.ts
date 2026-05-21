import { describe, expect, it } from 'vitest';

import { formatRelativeTime } from './logEntryTime';

const NOW = Date.parse('2026-05-21T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it('formats just-now and minute buckets deterministically', () => {
    expect(formatRelativeTime('2026-05-21T11:59:45.000Z', NOW)).toBe('just now');
    expect(formatRelativeTime('2026-05-21T11:57:00.000Z', NOW)).toBe('3m ago');
  });

  it('formats hour and day buckets deterministically', () => {
    expect(formatRelativeTime('2026-05-21T10:00:00.000Z', NOW)).toBe('2h ago');
    expect(formatRelativeTime('2026-05-17T12:00:00.000Z', NOW)).toBe('4d ago');
  });

  it.each(['', 'not-a-date'])('returns a safe fallback for %s', (input) => {
    expect(formatRelativeTime(input, NOW)).toBe('');
  });
});
