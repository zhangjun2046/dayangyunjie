/**
 * 生成 tabBar 占位 PNG（81x81），供双端 miniapp 使用。
 * 运行：node scripts/generate-tab-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/** 最小合法 PNG：指定 RGBA 像素 */
function createPng(width, height, r, g, b, a = 255) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const i = rowStart + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcBuf) >>> 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const icons = {
  'home.png': [122, 126, 131],
  'home-active.png': [22, 119, 255],
  'orders.png': [122, 126, 131],
  'orders-active.png': [22, 119, 255],
  'tasks.png': [122, 126, 131],
  'tasks-active.png': [22, 119, 255],
  'mine.png': [122, 126, 131],
  'mine-active.png': [22, 119, 255],
};

const customerIcons = ['home', 'orders', 'mine'];
const workerIcons = ['home', 'tasks', 'mine'];

function writeSet(dir, names) {
  fs.mkdirSync(dir, { recursive: true });
  for (const base of names) {
    fs.writeFileSync(
      path.join(dir, `${base}.png`),
      createPng(81, 81, ...icons[`${base}.png`]),
    );
    fs.writeFileSync(
      path.join(dir, `${base}-active.png`),
      createPng(81, 81, ...icons[`${base}-active.png`]),
    );
  }
}

writeSet(path.join(root, 'apps/miniapp-customer/src/static/tab'), customerIcons);
writeSet(path.join(root, 'apps/miniapp-worker/src/static/tab'), workerIcons);

console.info('[generate-tab-icons] wrote tab icons to customer & worker apps');
