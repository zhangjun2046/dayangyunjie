import { describe, expect, it } from 'vitest';
import { needsSilentWechatUnionidBind } from './silent-wechat-bind';

describe('needsSilentWechatUnionidBind', () => {
  it('未写 unionid 时需要另一次 wx.login 补绑', () => {
    expect(needsSilentWechatUnionidBind(false)).toBe(true);
  });

  it('登录已写入 unionid 则不再消耗 code', () => {
    expect(needsSilentWechatUnionidBind(true)).toBe(false);
  });
});
