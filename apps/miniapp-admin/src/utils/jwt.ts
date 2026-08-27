/**
 * 小程序 / H5 侧 JWT 本地解析。
 * 真机体验版没有可靠的 atob，必须用手写 base64，不能依赖浏览器 API。
 */

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const bytes: number[] = [];

  for (let i = 0; i < padded.length; i += 4) {
    const a = BASE64_ALPHABET.indexOf(padded[i] ?? '');
    const b = BASE64_ALPHABET.indexOf(padded[i + 1] ?? '');
    const cChar = padded[i + 2];
    const dChar = padded[i + 3];
    const c = cChar === '=' ? 0 : BASE64_ALPHABET.indexOf(cChar ?? '');
    const d = dChar === '=' ? 0 : BASE64_ALPHABET.indexOf(dChar ?? '');
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      throw new Error('invalid base64');
    }
    bytes.push((a << 2) | (b >> 4));
    if (cChar !== '=') bytes.push(((b & 15) << 4) | (c >> 2));
    if (dChar !== '=') bytes.push(((c & 3) << 6) | d);
  }

  return Uint8Array.from(bytes);
}

function utf8FromBytes(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i]!;
    if (b < 0x80) {
      result += String.fromCharCode(b);
    } else if (b >= 0xc0 && b < 0xe0 && i + 1 < bytes.length) {
      const c = ((b & 0x1f) << 6) | (bytes[i + 1]! & 0x3f);
      result += String.fromCharCode(c);
      i += 1;
    } else if (b >= 0xe0 && b < 0xf0 && i + 2 < bytes.length) {
      const c =
        ((b & 0x0f) << 12) | ((bytes[i + 1]! & 0x3f) << 6) | (bytes[i + 2]! & 0x3f);
      result += String.fromCharCode(c);
      i += 2;
    } else if (b >= 0xf0 && i + 3 < bytes.length) {
      i += 3;
    }
  }
  return result;
}

export function parseJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) {
      console.info('[admin-jwt] parse fail: no payload part, segs=', token.split('.').length);
      return null;
    }
    const json = utf8FromBytes(decodeBase64Url(part));
    const payload = JSON.parse(json) as { exp?: number };
    console.info(
      '[admin-jwt] decode ok, hasExp=',
      typeof payload.exp === 'number',
      'exp=',
      payload.exp ?? null,
    );
    return payload;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.info('[admin-jwt] parse fail:', msg);
    return null;
  }
}

export type JwtExpiry = 'valid' | 'expired' | 'unknown';

/** 解不出 exp 时返回 unknown，不能当成已过期。 */
export function readJwtExpiry(token: string, skewSeconds = 30): JwtExpiry {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) {
    console.info('[admin-jwt] expiry=unknown (decode failed or no exp)');
    return 'unknown';
  }
  const expired = payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  const status: JwtExpiry = expired ? 'expired' : 'valid';
  console.info(
    '[admin-jwt] expiry=',
    status,
    'expMs=',
    payload.exp * 1000,
    'now=',
    Date.now(),
    'skewSec=',
    skewSeconds,
  );
  return status;
}
