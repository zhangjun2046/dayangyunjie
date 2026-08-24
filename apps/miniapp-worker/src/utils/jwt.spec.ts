import { describe, expect, it } from 'vitest';
import { parseJwtPayload, readJwtExpiry } from './jwt';

function makeToken(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${b64}.sig`;
}

describe('parseJwtPayload', () => {
  it('不依赖 atob 也能解出 exp', () => {
    const originalAtob = globalThis.atob;
    // @ts-expect-error 模拟微信真机没有 atob
    globalThis.atob = undefined;
    try {
      const exp = Math.floor(Date.now() / 1000) + 7200;
      expect(parseJwtPayload(makeToken({ exp, sub: 1 }))).toEqual({ exp, sub: 1 });
    } finally {
      globalThis.atob = originalAtob;
    }
  });

  it('非法 token 返回 null', () => {
    expect(parseJwtPayload('not-a-jwt')).toBeNull();
    expect(parseJwtPayload('')).toBeNull();
  });
});

describe('readJwtExpiry', () => {
  it('未来 exp 为 valid', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(readJwtExpiry(token)).toBe('valid');
  });

  it('过去 exp 为 expired', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 10 });
    expect(readJwtExpiry(token, 0)).toBe('expired');
  });

  it('解不出 exp 为 unknown 而不是 expired', () => {
    expect(readJwtExpiry('aaa.bbb.ccc')).toBe('unknown');
  });
});
