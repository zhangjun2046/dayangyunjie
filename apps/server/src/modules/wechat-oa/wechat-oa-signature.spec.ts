import { createHash } from 'crypto';
import { verifyWechatOaSignature } from './wechat-oa-signature';

describe('verifyWechatOaSignature', () => {
  it('accepts the WeChat sorted-token sha1', () => {
    const token = 'oa_token';
    const timestamp = '1710000000';
    const nonce = 'nonce-1';
    const signature = createHash('sha1').update([token, timestamp, nonce].sort().join('')).digest('hex');
    expect(verifyWechatOaSignature({ token, signature, timestamp, nonce })).toBe(true);
  });

  it('rejects a wrong signature or missing fields', () => {
    expect(
      verifyWechatOaSignature({
        token: 'oa_token',
        signature: 'deadbeef',
        timestamp: '1',
        nonce: 'n',
      }),
    ).toBe(false);
    expect(verifyWechatOaSignature({ token: 'oa_token', signature: 'x', timestamp: '1' })).toBe(false);
  });
});
