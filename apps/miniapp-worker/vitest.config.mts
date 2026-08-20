import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** 纯 TypeScript 单元测试配置，避免加载 uni-app 构建插件。 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(currentDirectory, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    clearMocks: true,
  },
});
