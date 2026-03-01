const DEFAULT_API_BASE_URL = 'http://localhost:8080';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const resolveApiBaseUrl = (): string => {
  const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredApiUrl) {
    return trimTrailingSlash(configuredApiUrl);
  }

  return DEFAULT_API_BASE_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

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
  const { body, headers, ...restOptions } = options;

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

    throw new ApiError(errorMessage, response.status, responseBody);
  }

  return responseBody as TResponse;
}
