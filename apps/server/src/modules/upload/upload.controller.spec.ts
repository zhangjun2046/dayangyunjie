import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { IStorageService } from '../../common/storage/storage.interface';
import { UploadController } from './upload.controller';

function createFile(
  buffer: Buffer,
  mimetype = 'image/png',
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'icon.png',
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    destination: '',
    filename: '',
    path: '',
    buffer,
    stream: undefined as never,
    ...overrides,
  };
}

describe('UploadController — service icon suite', () => {
  const save = jest.fn<Promise<string>, [string, Buffer]>();
  const storageService: IStorageService = { save };
  const controller = new UploadController(storageService);

  beforeEach(() => {
    save.mockReset();
    save.mockResolvedValue('https://cdn.example.com/uploads/icon.webp');
  });

  describe('uploadIcon success matrix', () => {
    it('PNG 透明图：输出 WebP、保留 alpha、约束到 512 内', async () => {
      const source = await sharp({
        create: {
          width: 900,
          height: 600,
          channels: 4,
          background: { r: 20, g: 100, b: 200, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer();

      const result = await controller.uploadIcon(createFile(source));

      expect(result).toEqual({
        code: 0,
        message: 'ok',
        data: {
          url: 'https://cdn.example.com/uploads/icon.webp',
          filename: expect.stringMatching(/^ICON_\d+_[A-Z0-9]{6}\.webp$/),
        },
      });

      const [filename, storedBuffer] = save.mock.calls[0];
      const metadata = await sharp(storedBuffer).metadata();
      expect(filename).toBe(result.data.filename);
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(512);
      expect(metadata.height).toBe(341);
      expect(metadata.hasAlpha).toBe(true);
    });

    it('JPEG 小图：不放大', async () => {
      const source = await sharp({
        create: {
          width: 128,
          height: 128,
          channels: 3,
          background: '#ffffff',
        },
      })
        .jpeg()
        .toBuffer();

      await controller.uploadIcon(createFile(source, 'image/jpeg'));
      const metadata = await sharp(save.mock.calls[0][1]).metadata();
      expect(metadata.width).toBe(128);
      expect(metadata.height).toBe(128);
      expect(metadata.format).toBe('webp');
    });

    it('WebP 输入：同样可上传并转为 ICON_*.webp', async () => {
      const source = await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .webp()
        .toBuffer();

      const result = await controller.uploadIcon(createFile(source, 'image/webp'));
      expect(result.data.filename).toMatch(/^ICON_\d+_[A-Z0-9]{6}\.webp$/);
      const metadata = await sharp(save.mock.calls[0][1]).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
    });

    it('正方形大图：等比例缩到 512×512', async () => {
      const source = await sharp({
        create: {
          width: 1024,
          height: 1024,
          channels: 3,
          background: '#00ff00',
        },
      })
        .png()
        .toBuffer();

      await controller.uploadIcon(createFile(source));
      const metadata = await sharp(save.mock.calls[0][1]).metadata();
      expect(metadata.width).toBe(512);
      expect(metadata.height).toBe(512);
    });

    it('恰好 1MB size 字段允许进入处理（内容合法则成功）', async () => {
      const source = await sharp({
        create: {
          width: 64,
          height: 64,
          channels: 3,
          background: '#ffffff',
        },
      })
        .png()
        .toBuffer();

      await expect(
        controller.uploadIcon(
          createFile(source, 'image/png', { size: 1024 * 1024 }),
        ),
      ).resolves.toMatchObject({ code: 0 });
    });
  });

  describe('uploadIcon rejection matrix', () => {
    it('缺少 file', async () => {
      await expect(controller.uploadIcon(undefined as never)).rejects.toThrow(
        new BadRequestException('未接收到文件，请确认请求包含 file 字段'),
      );
    });

    it.each([
      ['image/svg+xml'],
      ['image/gif'],
      ['application/pdf'],
      ['text/plain'],
    ])('拒绝 MIME %s', async (mimetype) => {
      await expect(
        controller.uploadIcon(createFile(Buffer.from('x'), mimetype)),
      ).rejects.toThrow('仅允许 JPEG / PNG / WebP');
      expect(save).not.toHaveBeenCalled();
    });

    it('拒绝超过 1MB', async () => {
      await expect(
        controller.uploadIcon(
          createFile(Buffer.alloc(1), 'image/png', { size: 1024 * 1024 + 1 }),
        ),
      ).rejects.toThrow('服务图标大小不能超过 1MB');
      expect(save).not.toHaveBeenCalled();
    });

    it('拒绝损坏图片内容', async () => {
      await expect(
        controller.uploadIcon(createFile(Buffer.from('not-an-image'))),
      ).rejects.toThrow('图片内容无效或已损坏');
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('与含水印接口隔离', () => {
    it('upload/image 仍输出 JPEG 且文件名不以 ICON_ 开头', async () => {
      const source = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: '#ffffff',
        },
      })
        .png()
        .toBuffer();

      const result = await controller.uploadImage(createFile(source), 'ORDER-1');
      expect(result.data.filename).toMatch(/^ORDER1_\d+_[A-Z0-9]{6}\.jpg$/);
      expect(result.data.filename.startsWith('ICON_')).toBe(false);
      const metadata = await sharp(save.mock.calls[0][1]).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    it('upload/icon 不添加水印文字（输出为纯 WebP）', async () => {
      const source = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: '#112233',
        },
      })
        .png()
        .toBuffer();

      await controller.uploadIcon(createFile(source));
      const metadata = await sharp(save.mock.calls[0][1]).metadata();
      // 无水印链路统一为 webp；含水印链路固定 jpeg
      expect(metadata.format).toBe('webp');
      expect(resultFilenameIsIcon(save.mock.calls[0][0])).toBe(true);
    });
  });
});

function resultFilenameIsIcon(filename: string): boolean {
  return /^ICON_\d+_[A-Z0-9]{6}\.webp$/.test(filename);
}
