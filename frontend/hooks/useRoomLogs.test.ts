import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRoomLogs, type LogEvent, ROOM_LOGS_PAGE_SIZE } from '@/api/logs';
import { useRoomLogs } from '@/hooks/useRoomLogs';

vi.mock('@/api/logs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/logs')>();

  return {
    ...actual,
    getRoomLogs: vi.fn(),
  };
});

const mockGetRoomLogs = vi.mocked(getRoomLogs);

function makeLogEntry(id: string, index = 0): LogEvent {
  return {
    id,
    roomId: 'room-1',
    eventType: 'character_updated',
    actorId: index % 2 === 0 ? 'user-1' : null,
    summary: `Log ${id}`,
    payload: { index },
    occurredAt: `2026-05-21T10:${String(index).padStart(2, '0')}:00.000Z`,
    createdAt: `2026-05-21T10:${String(index).padStart(2, '0')}:01.000Z`,
    updatedAt: `2026-05-21T10:${String(index).padStart(2, '0')}:01.000Z`,
  };
}

function makeFullPage(prefix: string): LogEvent[] {
  return Array.from({ length: ROOM_LOGS_PAGE_SIZE }, (_, index) => makeLogEntry(`${prefix}-${index}`, index));
}

describe('useRoomLogs', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetRoomLogs.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('loads the first page by roomId and preserves returned order', async () => {
    const firstPage = [makeLogEntry('newest'), makeLogEntry('older')];
    mockGetRoomLogs.mockResolvedValueOnce(firstPage);

    const { result } = renderHook(() => useRoomLogs('room-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.entries.map((entry) => entry.id)).toEqual(['newest', 'older']);
    });
    expect(mockGetRoomLogs).toHaveBeenCalledTimes(1);
    expect(mockGetRoomLogs).toHaveBeenCalledWith('room-1', null, expect.any(AbortSignal));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('requests each next page using the last held entry id across multiple pages and appends without reordering', async () => {
    const firstPage = makeFullPage('page-1');
    const secondPage = makeFullPage('page-2');
    const thirdPage = [makeLogEntry('page-3-0')];
    mockGetRoomLogs
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage)
      .mockResolvedValueOnce(thirdPage);

    const { result } = renderHook(() => useRoomLogs('room-1'), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(ROOM_LOGS_PAGE_SIZE));

    await act(async () => {
      await result.current.loadNextPage();
    });

    expect(mockGetRoomLogs).toHaveBeenNthCalledWith(
      2,
      'room-1',
      firstPage[firstPage.length - 1].id,
      expect.any(AbortSignal),
    );
    await waitFor(() => expect(result.current.entries).toHaveLength(ROOM_LOGS_PAGE_SIZE * 2));

    await act(async () => {
      await result.current.loadNextPage();
    });

    // Highest-value assertion: page 3's cursor must be the last entry of page 2,
    // not page 1 — proves the cursor tracks the most recent held page.
    expect(mockGetRoomLogs).toHaveBeenNthCalledWith(
      3,
      'room-1',
      secondPage[secondPage.length - 1].id,
      expect.any(AbortSignal),
    );
    await waitFor(() => {
      expect(result.current.entries.map((entry) => entry.id)).toEqual([
        ...firstPage.map((entry) => entry.id),
        ...secondPage.map((entry) => entry.id),
        'page-3-0',
      ]);
    });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('stops paginating after a short page and treats later load requests as no-ops', async () => {
    const shortPage = [makeLogEntry('only-log')];
    mockGetRoomLogs.mockResolvedValueOnce(shortPage);

    const { result } = renderHook(() => useRoomLogs('room-1'), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    await act(async () => {
      await result.current.loadNextPage();
    });

    expect(result.current.hasNextPage).toBe(false);
    expect(mockGetRoomLogs).toHaveBeenCalledTimes(1);
  });

  it('guards against concurrent duplicate next-page requests', async () => {
    const firstPage = makeFullPage('page-1');
    let resolveNextPage: (entries: LogEvent[]) => void = () => undefined;
    const nextPagePromise = new Promise<LogEvent[]>((resolve) => {
      resolveNextPage = resolve;
    });
    mockGetRoomLogs.mockResolvedValueOnce(firstPage).mockReturnValueOnce(nextPagePromise);

    const { result } = renderHook(() => useRoomLogs('room-1'), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(ROOM_LOGS_PAGE_SIZE));

    let firstLoad: Promise<void>;
    let secondLoad: Promise<void>;
    act(() => {
      firstLoad = result.current.loadNextPage();
      secondLoad = result.current.loadNextPage();
    });

    expect(mockGetRoomLogs).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveNextPage([makeLogEntry('page-2-0')]);
      await firstLoad;
      await secondLoad;
    });

    await waitFor(() => {
      expect(result.current.entries.at(-1)?.id).toBe('page-2-0');
    });
    expect(mockGetRoomLogs).toHaveBeenCalledTimes(2);
  });

  it('surfaces first-page errors and refresh re-issues page one', async () => {
    mockGetRoomLogs.mockRejectedValueOnce(new Error('Load failed'));

    const { result } = renderHook(() => useRoomLogs('room-1'), { wrapper });

    await waitFor(() => expect(result.current.errorMessage).toBe('Load failed'));

    mockGetRoomLogs.mockResolvedValue(makeFullPage('retry'));
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.entries[0]?.id).toBe('retry-0');
    });
    expect(mockGetRoomLogs).toHaveBeenLastCalledWith('room-1', null, expect.any(AbortSignal));
  });

  it('keeps loaded entries when a next-page request fails', async () => {
    const firstPage = makeFullPage('page-1');
    mockGetRoomLogs.mockResolvedValueOnce(firstPage).mockRejectedValueOnce(new Error('Next page failed'));

    const { result } = renderHook(() => useRoomLogs('room-1'), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(ROOM_LOGS_PAGE_SIZE));

    await act(async () => {
      await result.current.loadNextPage();
    });

    await waitFor(() => expect(result.current.errorMessage).toBe('Next page failed'));
    expect(result.current.entries.map((entry) => entry.id)).toEqual(firstPage.map((entry) => entry.id));
  });

  it('does not fetch without a roomId', async () => {
    const { result } = renderHook(() => useRoomLogs(undefined), { wrapper });

    expect(result.current.entries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockGetRoomLogs).not.toHaveBeenCalled();
  });
});
