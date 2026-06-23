import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

/**
 * 修复 @dcloudio/uni-ui easycom 模式下生成的相对路径 chunk 文件名
 * 兼容 Rollup 4.x 严格路径校验（不允许 ../ 开头的 chunkFileNames）
 */
function fixUniUIChunkNames() {
  const chunkPathMap = new Map<string, string>();

  return {
    name: 'fix-uni-ui-chunk-names',
    outputOptions(options: Record<string, unknown>) {
      chunkPathMap.clear();
      const original = options.chunkFileNames;
      options.chunkFileNames = (chunkInfo: { name: string; [key: string]: unknown }) => {
        let name: string;
        if (typeof original === 'function') {
          name = (original as (info: typeof chunkInfo) => string)(chunkInfo);
        } else {
          name = (original as string) || '[name]-[hash].js';
        }
        if (typeof name === 'string' && (name.startsWith('../') || name.startsWith('./'))) {
          const stripped = name.replace(/^(\.\.\/|\.\/)+/, '');
          chunkPathMap.set(stripped, name);
          name = stripped;
        }
        return name;
      };
      return options;
    },
    writeBundle(outputOptions: { dir?: string }, bundle: Record<string, unknown>) {
      const outDir = outputOptions.dir;
      if (!outDir || chunkPathMap.size === 0) return;

      for (const bundleFileName of Object.keys(bundle)) {
        if (chunkPathMap.has(bundleFileName)) {
          const originalRelPath = chunkPathMap.get(bundleFileName)!;
          const srcPath = path.resolve(outDir, bundleFileName);
          const destPath = path.resolve(outDir, originalRelPath);
          if (fs.existsSync(srcPath)) {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(srcPath, destPath);
            fs.rmSync(srcPath);
          }
        }
      }
      const nodeModulesInOutput = path.resolve(outDir, 'node-modules');
      if (fs.existsSync(nodeModulesInOutput)) {
        try { fs.rmSync(nodeModulesInOutput, { recursive: true, force: true }); } catch {}
      }
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
    port: 5174,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
