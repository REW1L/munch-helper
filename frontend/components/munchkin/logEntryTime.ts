const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const timestamp = Date.parse(iso);

  if (!iso || Number.isNaN(timestamp)) {
    return '';
  }

  const elapsed = Math.max(0, now - timestamp);

  if (elapsed < MINUTE_MS) {
    return 'just now';
  }

  if (elapsed < HOUR_MS) {
    return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  }

  if (elapsed < DAY_MS) {
    return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  }

  return `${Math.floor(elapsed / DAY_MS)}d ago`;
}
