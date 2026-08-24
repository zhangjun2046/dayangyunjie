import * as fs from 'fs';
import * as path from 'path';
import { config as loadDotenv } from 'dotenv';

/**
 * Nest / Prisma 不会自动读取 .env。
 * 从仓库根执行 `npm run dev` 时 cwd 往往是仓库根，
 * 因此同时探测 apps/server/.env 与当前目录 .env。
 */
function resolveEnvPath(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/server/.env'),
    path.resolve(__dirname, '..', '.env'),
  ];
  return candidates.find((file) => fs.existsSync(file));
}

const envPath = resolveEnvPath();
if (envPath) {
  loadDotenv({ path: envPath });
}
