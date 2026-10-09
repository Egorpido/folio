import { defineConfig } from 'vitest/config';

// Отдельная настройка для тестов: им не нужны сборка приложения и офлайн-режим.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
