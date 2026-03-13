import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'user-service/src/**/*.test.ts',
      'room-service/src/**/*.test.ts',
      'character-service/src/**/*.test.ts',
      'room-notifications-service/src/**/*.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'user-service/src/**/*.ts',
        'room-service/src/**/*.ts',
        'character-service/src/**/*.ts',
        'room-notifications-service/src/**/*.ts'
      ],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        '**/models/**/*.ts'
      ],
      thresholds: {
        lines: 70
      }
    }
  }
});