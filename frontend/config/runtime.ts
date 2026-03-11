import { z } from 'zod';

const DEFAULT_API_BASE_URL = 'http://localhost:8080';

const RuntimeConfigSchema = z.object({
  EXPO_PUBLIC_API_URL: z.url().optional(),
});

type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

let cachedConfig: RuntimeConfig | null = null;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const isDevEnvironment = (): boolean => {
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }

  return process.env.NODE_ENV !== 'production';
};

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsedConfig = RuntimeConfigSchema.safeParse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  });

  if (!parsedConfig.success) {
    const issue = parsedConfig.error.issues[0];
    throw new Error(`Invalid runtime configuration for ${issue.path.join('.')}: ${issue.message}`);
  }

  cachedConfig = parsedConfig.data;
  return parsedConfig.data;
}

export function resolveApiBaseUrl(): string {
  const { EXPO_PUBLIC_API_URL } = getRuntimeConfig();

  if (EXPO_PUBLIC_API_URL) {
    return trimTrailingSlash(EXPO_PUBLIC_API_URL);
  }

  if (isDevEnvironment()) {
    return DEFAULT_API_BASE_URL;
  }

  throw new Error('Missing EXPO_PUBLIC_API_URL in a non-development environment.');
}

export const API_BASE_URL = resolveApiBaseUrl();
