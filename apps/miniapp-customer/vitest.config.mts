import { defineConfig } from 'vitest/config';

/** 纯 TypeScript 单元测试配置，避免加载 uni-app 的构建插件。 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    clearMocks: true,
  },
});
