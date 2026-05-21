import { LogEvent, getRoomLogs, ROOM_LOGS_PAGE_SIZE } from '@/api/logs';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';

export interface UseRoomLogsResult {
  entries: LogEvent[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  errorMessage: string | null;
  loadNextPage: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const getRoomLogsQueryKey = (
  roomId: string | undefined,
): readonly ['roomLogs', string | undefined] => ['roomLogs', roomId];

export function useRoomLogs(roomId: string | undefined): UseRoomLogsResult {
  const queryClient = useQueryClient();
  const roomLogsQueryKey = useMemo(() => getRoomLogsQueryKey(roomId), [roomId]);
  const nextPageInFlightRef = useRef(false);

  const roomLogsQuery = useInfiniteQuery({
    queryKey: roomLogsQueryKey,
    queryFn: async ({ pageParam, signal }) => {
      if (!roomId) {
        return [];
      }

      return getRoomLogs(roomId, pageParam, signal);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < ROOM_LOGS_PAGE_SIZE ? undefined : (lastPage[lastPage.length - 1]?.id ?? undefined),
    enabled: Boolean(roomId),
  });

  const entries = useMemo(() => roomLogsQuery.data?.pages.flat() ?? [], [roomLogsQuery.data]);

  const loadNextPage = useCallback(async () => {
    if (!roomLogsQuery.hasNextPage || roomLogsQuery.isFetchingNextPage || nextPageInFlightRef.current) {
      return;
    }

    nextPageInFlightRef.current = true;
    try {
      await roomLogsQuery.fetchNextPage();
    } finally {
      nextPageInFlightRef.current = false;
    }
  }, [roomLogsQuery.fetchNextPage, roomLogsQuery.hasNextPage, roomLogsQuery.isFetchingNextPage]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: roomLogsQueryKey });
    await queryClient.refetchQueries({ queryKey: roomLogsQueryKey });
  }, [queryClient, roomLogsQueryKey]);

  return useMemo(
    () => ({
      entries,
      isLoading: roomLogsQuery.isLoading || (roomLogsQuery.isFetching && entries.length === 0),
      isFetchingNextPage: roomLogsQuery.isFetchingNextPage,
      hasNextPage: Boolean(roomLogsQuery.hasNextPage),
      errorMessage: roomLogsQuery.error instanceof Error ? roomLogsQuery.error.message : null,
      loadNextPage,
      refresh,
    }),
    [
      entries,
      loadNextPage,
      refresh,
      roomLogsQuery.error,
      roomLogsQuery.hasNextPage,
      roomLogsQuery.isFetching,
      roomLogsQuery.isFetchingNextPage,
      roomLogsQuery.isLoading,
    ],
  );
}
