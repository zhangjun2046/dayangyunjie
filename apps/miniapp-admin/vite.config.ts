import path from 'node:path';
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  // 生产托管在同域子路径 /m-admin/（见 plan/deploy-worker-employment-status.md）
  base: process.env.NODE_ENV === 'production' ? '/m-admin/' : '/',
  plugins: [uni()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5176,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
