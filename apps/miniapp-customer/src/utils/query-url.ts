/**
 * 从页面 query 中取出被当作参数传递的完整 URL。
 *
 * 小程序框架已对 onLoad 的 query 自动 decode 一次，若再无条件 decodeURIComponent，
 * 目标地址自身的 percent 编码（如 ?q=%E4%B8%AD）会被二次还原而失真；
 * 因此仅在仍残留 % 时补解一次，解析失败按原值返回。
 */
export function decodeQueryUrl(raw: string | undefined | null): string {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value.includes('%')) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
