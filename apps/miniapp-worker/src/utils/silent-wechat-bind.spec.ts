import { describe, expect, it } from 'vitest';
import { needsSilentWechatUnionidBind } from './silent-wechat-bind';

describe('needsSilentWechatUnionidBind', () => {
  it('未写 unionid 时需要静默绑定', () => {
    expect(needsSilentWechatUnionidBind(false)).toBe(true);
  });

  it('已绑定则不再消耗 wx.login', () => {
    expect(needsSilentWechatUnionidBind(true)).toBe(false);
  });
});
