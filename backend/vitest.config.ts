import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'user-service/src/**/*.test.ts',
      'room-service/src/**/*.test.ts',
      'character-service/src/**/*.test.ts'
    ]
  }
});