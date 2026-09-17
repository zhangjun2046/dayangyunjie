import { createHash } from 'crypto';

export function verifyWechatOaSignature(input: {
  token: string;
  signature?: string;
  timestamp?: string;
  nonce?: string;
}): boolean {
  const token = input.token.trim();
  const signature = (input.signature ?? '').trim().toLowerCase();
  const timestamp = (input.timestamp ?? '').trim();
  const nonce = (input.nonce ?? '').trim();
  if (!token || !signature || !timestamp || !nonce) {
    return false;
  }
  const digest = createHash('sha1')
    .update([token, timestamp, nonce].sort().join(''))
    .digest('hex');
  return digest === signature;
}
