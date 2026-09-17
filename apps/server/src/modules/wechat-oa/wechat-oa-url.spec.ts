import {
  buildAdminH5HashUrl,
  buildAdminOauthLandingHash,
  buildAdminOrderDetailHash,
  buildWechatSnsAuthorizeUrl,
  hashOaOauthToken,
  oauthCallbackRedirectUri,
  parseOaRedirectTarget,
} from './wechat-oa-url';

describe('wechat-oa-url', () => {
  it('oauth callback URI 钉死在 API 主机，不带 hash', () => {
    expect(oauthCallbackRedirectUri('https://api.yunjiezhixiang.cn/')).toBe(
      'https://api.yunjiezhixiang.cn/api/v1/wechat/oa/oauth/callback',
    );
    expect(oauthCallbackRedirectUri('待补充')).toBeNull();
  });

  it('H5 hash 只拼本站 pages，拒绝外部 path', () => {
    expect(
      buildAdminH5HashUrl(
        'https://h5.yunjiezhixiang.cn',
        buildAdminOrderDetailHash({ type: 'cleaning', id: 8 }),
      ),
    ).toBe('https://h5.yunjiezhixiang.cn/#/pages/order-detail/index?id=8&type=cleaning');
    expect(buildAdminH5HashUrl('https://h5.yunjiezhixiang.cn', '/https://evil.example/x')).toBeNull();
    expect(buildAdminOauthLandingHash({ status: 'error', reason: 'expired' })).toBe(
      '/pages/wechat-bind/index?status=error&reason=expired',
    );
  });

  it('中转 query 只允许 cleaning|recycling + 正整数 id', () => {
    expect(parseOaRedirectTarget('CLEANING', '12')).toEqual({ type: 'cleaning', id: 12 });
    expect(parseOaRedirectTarget('consult', '1')).toBeNull();
    expect(parseOaRedirectTarget('cleaning', '-1')).toBeNull();
    expect(parseOaRedirectTarget('recycling', 'abc')).toBeNull();
  });

  it('授权 URL 使用 snsapi_base 且 state 为明文 token', () => {
    const url = buildWechatSnsAuthorizeUrl({
      appId: 'wxoa',
      redirectUri: 'https://api.yunjiezhixiang.cn/api/v1/wechat/oa/oauth/callback',
      state: 'abc',
    });
    expect(url.startsWith('https://open.weixin.qq.com/connect/oauth2/authorize?')).toBe(true);
    expect(url).toContain('scope=snsapi_base');
    expect(url).toContain('state=abc');
    expect(url.endsWith('#wechat_redirect')).toBe(true);
    expect(hashOaOauthToken('abc')).toHaveLength(64);
  });
});
