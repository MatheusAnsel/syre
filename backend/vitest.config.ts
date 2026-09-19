import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './tests/setup/testConfig';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/setup/global.ts'],
    // Todos os arquivos compartilham o mesmo banco: rodam um por vez.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'segredo-usado-somente-nos-testes',
      FRONTEND_URL: 'http://localhost:5173',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/db/migrate.ts', 'src/db/createAdmin.ts', 'src/types/**'],
      reporter: ['text', 'lcov'],
    },
  },
});
