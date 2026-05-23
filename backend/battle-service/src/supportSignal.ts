export type Subsystem = 'room' | 'character' | 'battle' | 'log' | 'session_continuity';

export type SupportFailureCode =
  | 'unexpected_error'
  | 'character_event_publish_failed'
  | 'battle_event_publish_failed'
  | 'log_invalid_event'
  | 'log_persist_failed'
  | 'log_read_failed'
  | 'ws_event_delivery_failed'
  | 'ws_dispatch_failed';

export interface SupportFailureInput {
  subsystem: Subsystem;
  code: SupportFailureCode;
  message: string;
  correlationId: string | null;
  roomId?: string;
  actorId?: string;
  sessionId?: string;
  httpStatus?: number;
  errorName?: string;
  errorMessage?: string;
}

const ALLOWED_KEYS: ReadonlyArray<keyof SupportFailureInput> = [
  'subsystem',
  'code',
  'message',
  'correlationId',
  'roomId',
  'actorId',
  'sessionId',
  'httpStatus',
  'errorName',
  'errorMessage'
];

export function logSupportFailure(input: SupportFailureInput): void {
  const body: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    const value = input[key];
    if (value !== undefined) {
      body[key] = value;
    }
  }

  // eslint-disable-next-line no-console
  console.error('support.failure', body);
}

export function extractErrorFields(error: unknown): { errorName?: string; errorMessage?: string } {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message };
  }
  if (typeof error === 'string') {
    return { errorMessage: error };
  }
  return {};
}
