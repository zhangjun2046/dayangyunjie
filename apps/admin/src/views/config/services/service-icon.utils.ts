/** 服务类型图标前端校验与提交载荷工具 */

export const MAX_SERVICE_ICON_FILE_SIZE = 1024 * 1024;

export const ALLOWED_SERVICE_ICON_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type ServiceIconValidationResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * 校验待上传的服务图标文件格式与大小。
 */
export function validateServiceIconFile(file: {
  type: string;
  size: number;
} | null | undefined): ServiceIconValidationResult {
  if (!file) {
    return { ok: false, message: '请选择要上传的图片' };
  }
  if (!ALLOWED_SERVICE_ICON_TYPES.includes(file.type as (typeof ALLOWED_SERVICE_ICON_TYPES)[number])) {
    return { ok: false, message: '仅支持 JPG、PNG、WebP 格式' };
  }
  if (file.size > MAX_SERVICE_ICON_FILE_SIZE) {
    return { ok: false, message: '服务图标大小不能超过 1MB' };
  }
  return { ok: true };
}

/**
 * 从上传接口响应中提取图标 URL。
 */
export function extractUploadedIconUrl(payload: {
  data?: { url?: string | null } | null;
} | null | undefined): string | null {
  const url = payload?.data?.url?.trim();
  return url || null;
}

/**
 * 组装创建服务目录时的 icon 字段：空字符串视为未配置。
 */
export function buildCreateIconPayload(icon: string): string | undefined {
  const trimmed = icon.trim();
  return trimmed || undefined;
}

/**
 * 组装编辑服务目录时的 icon 字段：空字符串视为清除（传 null）。
 */
export function buildUpdateIconPayload(icon: string): string | null {
  const trimmed = icon.trim();
  return trimmed || null;
}
