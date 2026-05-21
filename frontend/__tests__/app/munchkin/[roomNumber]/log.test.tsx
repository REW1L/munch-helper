import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LogEvent } from '@/api/logs';

const mockLogsState = vi.hoisted(() => {
  const createState = (): {
    entries: LogEvent[];
    isLoading: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    errorMessage: string | null;
    loadNextPage: () => Promise<void>;
    refresh: () => Promise<void>;
  } => ({
    entries: [
      {
        id: 'log-1',
        roomId: 'ROOM42',
        eventType: 'character_created',
        actorId: 'user-1',
        summary: 'Created Alice',
        payload: { character: { name: 'Alice' } },
        occurredAt: '2026-05-21T10:00:00.000Z',
      },
    ],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    errorMessage: null,
    loadNextPage: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
  });

  return { current: createState(), createState };
});

vi.mock('react-native-safe-area-context', async () => {
  const ReactRuntime = await import('react');

  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
      ReactRuntime.createElement('div', props, children),
  };
});

vi.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({
    roomNumber: 'ROOM42',
  }),
}));

vi.mock('@/hooks/useRoomLogs', () => ({
  useRoomLogs: () => mockLogsState.current,
}));

vi.mock('@/components/munchkin/LogEntry', async () => {
  const ReactRuntime = await import('react');

  return {
    default: ({ entry }: { entry: LogEvent }) =>
      ReactRuntime.createElement('div', { 'data-testid': 'mock-log-entry' }, entry.summary),
  };
});

describe('Room history log route', () => {
  beforeEach(() => {
    mockLogsState.current = mockLogsState.createState();
  });

  it('renders the initial loading state', async () => {
    mockLogsState.current = {
      ...mockLogsState.current,
      entries: [],
      isLoading: true,
    };
    const { default: LogScreen } = await import('../../../../app/munchkin/[roomNumber]/log');

    render(<LogScreen />);

    expect(screen.getByText('Loading history')).toBeTruthy();
  });

  it('renders a first-page error with retry', async () => {
    mockLogsState.current = {
      ...mockLogsState.current,
      entries: [],
      errorMessage: 'History failed',
    };
    const { default: LogScreen } = await import('../../../../app/munchkin/[roomNumber]/log');

    render(<LogScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading room history' }));

    expect(screen.getByText('History failed')).toBeTruthy();
    expect(mockLogsState.current.refresh).toHaveBeenCalledOnce();
  });

  it('renders loaded entries through the LogEntry seam', async () => {
    const { default: LogScreen } = await import('../../../../app/munchkin/[roomNumber]/log');

    render(<LogScreen />);

    expect(screen.getByText('Created Alice')).toBeTruthy();
    expect(screen.getByTestId('mock-log-entry')).toBeTruthy();
  });

  it('renders the 6.6 empty state copy when no history exists', async () => {
    mockLogsState.current = {
      ...mockLogsState.current,
      entries: [],
    };
    const { default: LogScreen } = await import('../../../../app/munchkin/[roomNumber]/log');

    render(<LogScreen />);

    expect(screen.getByText('No events recorded yet.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders a next-page spinner in the list footer', async () => {
    mockLogsState.current = {
      ...mockLogsState.current,
      isFetchingNextPage: true,
    };
    const { default: LogScreen } = await import('../../../../app/munchkin/[roomNumber]/log');

    render(<LogScreen />);

    expect(screen.getByText('Loading more history')).toBeTruthy();
  });

  it('keeps loaded entries visible and offers next-page retry', async () => {
    mockLogsState.current = {
      ...mockLogsState.current,
      errorMessage: 'Next page failed',
    };
    const { default: LogScreen } = await import('../../../../app/munchkin/[roomNumber]/log');

    render(<LogScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading older history' }));

    expect(screen.getByText('Created Alice')).toBeTruthy();
    expect(screen.getByText('Next page failed')).toBeTruthy();
    expect(mockLogsState.current.loadNextPage).toHaveBeenCalledOnce();
  });
});
