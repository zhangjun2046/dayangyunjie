export const MAX_PRICE_POSTER_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_PRICE_POSTER_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export function isLargeRecyclingCatalog(
  bizType?: string | null,
  name?: string | null,
): boolean {
  return bizType === 'RECYCLING' && Boolean(name?.includes('大件'));
}

export function validatePricePosterFile(file: {
  type: string;
  size: number;
} | null | undefined): { ok: true } | { ok: false; message: string } {
  if (!file) {
    return { ok: false, message: '请选择要上传的图片' };
  }
  if (!ALLOWED_PRICE_POSTER_TYPES.includes(file.type as (typeof ALLOWED_PRICE_POSTER_TYPES)[number])) {
    return { ok: false, message: '仅支持 JPG、PNG、WebP 格式' };
  }
  if (file.size > MAX_PRICE_POSTER_FILE_SIZE) {
    return { ok: false, message: '价格海报大小不能超过 10MB' };
  }
  return { ok: true };
}
