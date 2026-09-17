/** 已有 unionid 则不再消耗 wx.login；粉丝配对靠关注回调。 */
export function needsSilentWechatUnionidBind(bound: boolean): boolean {
  return !bound;
}
