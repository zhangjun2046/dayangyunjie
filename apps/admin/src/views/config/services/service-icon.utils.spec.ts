import { describe, expect, it } from 'vitest';
import {
  ALLOWED_SERVICE_ICON_TYPES,
  MAX_SERVICE_ICON_FILE_SIZE,
  buildCreateIconPayload,
  buildUpdateIconPayload,
  extractUploadedIconUrl,
  validateServiceIconFile,
} from './service-icon.utils';

describe('service icon utils', () => {
  describe('validateServiceIconFile', () => {
    it('拒绝空文件', () => {
      expect(validateServiceIconFile(null)).toEqual({
        ok: false,
        message: '请选择要上传的图片',
      });
      expect(validateServiceIconFile(undefined)).toEqual({
        ok: false,
        message: '请选择要上传的图片',
      });
    });

    it.each([
      ['image/jpeg'],
      ['image/png'],
      ['image/webp'],
    ] as const)('接受合法格式 %s', (type) => {
      expect(
        validateServiceIconFile({ type, size: 100 }),
      ).toEqual({ ok: true });
    });

    it('拒绝非法 MIME', () => {
      expect(
        validateServiceIconFile({ type: 'image/svg+xml', size: 100 }),
      ).toEqual({
        ok: false,
        message: '仅支持 JPG、PNG、WebP 格式',
      });
      expect(
        validateServiceIconFile({ type: 'application/pdf', size: 100 }),
      ).toEqual({
        ok: false,
        message: '仅支持 JPG、PNG、WebP 格式',
      });
    });

    it('拒绝超过 1MB 的文件', () => {
      expect(
        validateServiceIconFile({
          type: 'image/png',
          size: MAX_SERVICE_ICON_FILE_SIZE + 1,
        }),
      ).toEqual({
        ok: false,
        message: '服务图标大小不能超过 1MB',
      });
    });

    it('允许恰好 1MB 的文件', () => {
      expect(
        validateServiceIconFile({
          type: 'image/webp',
          size: MAX_SERVICE_ICON_FILE_SIZE,
        }),
      ).toEqual({ ok: true });
    });

    it('白名单与常量一致', () => {
      expect(ALLOWED_SERVICE_ICON_TYPES).toEqual([
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);
    });
  });

  describe('extractUploadedIconUrl', () => {
    it('提取成功响应中的 URL', () => {
      expect(
        extractUploadedIconUrl({
          data: { url: ' https://cdn.example.com/icon.webp ' },
        }),
      ).toBe('https://cdn.example.com/icon.webp');
    });

    it('缺少 URL 时返回 null', () => {
      expect(extractUploadedIconUrl(null)).toBeNull();
      expect(extractUploadedIconUrl({})).toBeNull();
      expect(extractUploadedIconUrl({ data: {} })).toBeNull();
      expect(extractUploadedIconUrl({ data: { url: '' } })).toBeNull();
      expect(extractUploadedIconUrl({ data: { url: '   ' } })).toBeNull();
    });
  });

  describe('buildCreateIconPayload / buildUpdateIconPayload', () => {
    it('创建时空图标不写入字段', () => {
      expect(buildCreateIconPayload('')).toBeUndefined();
      expect(buildCreateIconPayload('   ')).toBeUndefined();
      expect(buildCreateIconPayload('https://cdn.example.com/a.webp')).toBe(
        'https://cdn.example.com/a.webp',
      );
    });

    it('编辑时空图标转为 null 以清除', () => {
      expect(buildUpdateIconPayload('')).toBeNull();
      expect(buildUpdateIconPayload('   ')).toBeNull();
      expect(buildUpdateIconPayload('https://cdn.example.com/b.webp')).toBe(
        'https://cdn.example.com/b.webp',
      );
    });
  });
});
