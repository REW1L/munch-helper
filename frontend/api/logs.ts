import { apiRequest } from '@/api/http';

export const ROOM_LOGS_PAGE_SIZE = 50;

export interface LogEvent {
  id: string;
  roomId: string;
  eventType: string;
  actorId: string | null;
  summary: string;
  payload: unknown;
  occurredAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getRoomLogs(
  roomId: string,
  before?: string | null,
  signal?: AbortSignal,
): Promise<LogEvent[]> {
  const cursorQuery = before ? `&before=${encodeURIComponent(before)}` : '';

  return apiRequest<LogEvent[]>(`/logs?roomId=${encodeURIComponent(roomId)}${cursorQuery}`, {
    signal,
  });
}
