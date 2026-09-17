import path from 'node:path';
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  // 阿里云正式 H5 托管在 h5 子域根路径；单域名测试环境可用 VITE_PUBLIC_BASE=/admin/ 覆盖。
  base: process.env.VITE_PUBLIC_BASE || '/',
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
