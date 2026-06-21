import path from 'node:path';
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

/**
 * 修复 @dcloudio/uni-ui easycom 模式下生成的相对路径 chunk 文件名
 * 兼容 Rollup 4.x 的严格路径校验（不允许 ../ 开头的 chunkFileNames）
 */
function fixUniUIChunkNames() {
  return {
    name: 'fix-uni-ui-chunk-names',
    outputOptions(options: Record<string, unknown>) {
      const original = options.chunkFileNames;
      options.chunkFileNames = (chunkInfo: { name: string; [key: string]: unknown }) => {
        let name: string;
        if (typeof original === 'function') {
          name = (original as (info: typeof chunkInfo) => string)(chunkInfo);
        } else {
          name = (original as string) || '[name]-[hash].js';
        }
        // 将 "../../node-modules/..." 形式的路径去除前缀，使其成为合法的输出路径
        if (typeof name === 'string' && (name.startsWith('../') || name.startsWith('./'))) {
          name = name.replace(/^(\.\.\/|\.\/)+/, '');
        }
        return name;
      };
      return options;
    },
  };
}

export default defineConfig({
  plugins: [uni(), fixUniUIChunkNames()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5175,
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
