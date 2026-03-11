import { API_BASE_URL } from '@/config/runtime';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  retryCount?: number;
  retryDelayMs?: number;
};

const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_RETRY_DELAY_MS = 250;

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  );
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
  const { body, headers, retryCount = DEFAULT_RETRY_COUNT, retryDelayMs = DEFAULT_RETRY_DELAY_MS, ...restOptions } = options;

  let attempt = 0;
  while (attempt <= retryCount) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...restOptions,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const hasJsonResponse = response.headers.get('content-type')?.includes('application/json') ?? false;
      const responseBody = hasJsonResponse ? await response.json() : undefined;

      if (!response.ok) {
        const errorMessage =
          (typeof responseBody === 'object' && responseBody && 'message' in responseBody && typeof responseBody.message === 'string'
            ? responseBody.message
            : `Request failed with status ${response.status}`);

        if (attempt < retryCount && isRetriableStatus(response.status)) {
          attempt += 1;
          await sleep(retryDelayMs * attempt);
          continue;
        }

        throw new ApiError(errorMessage, response.status, responseBody);
      }

      return responseBody as TResponse;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      if (error instanceof ApiError) {
        throw error;
      }

      if (attempt >= retryCount) {
        throw error;
      }

      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }

  throw new Error('Request failed unexpectedly.');
}
