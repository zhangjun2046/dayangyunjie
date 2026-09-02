import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import sharp from 'sharp';
import { IStorageService, STORAGE_SERVICE } from '../../common/storage/storage.interface';
import { UploadImageResponseDto } from './dto/upload-response.dto';

/** 最大上传文件大小：10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 服务类型图标最大上传文件大小：1 MB */
const MAX_ICON_FILE_SIZE = 1024 * 1024;

/** 允许的 MIME 类型 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * 生成存储文件名
 * 格式：{orderNo}_{timestamp}_{random6位}.jpg
 * orderNo 缺省时以 IMG 占位，避免文件名冲突。
 */
function buildFilename(orderNo?: string): string {
  const prefix = orderNo ? orderNo.replace(/[^A-Za-z0-9]/g, '') : 'IMG';
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}_${ts}_${rand}.jpg`;
}

/** 生成无水印服务图标文件名，统一保存为支持透明通道的 WebP。 */
function buildIconFilename(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ICON_${ts}_${rand}.webp`;
}

function buildPosterFilename(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `POSTER_${ts}_${rand}.webp`;
}

/**
 * 在图片右下角叠加水印文字（SVG composite，无需系统字体）
 * 水印内容：{orderNo} {YYYY-MM-DD HH:mm:ss}（orderNo 缺省时只显示时间）
 */
async function addWatermark(input: Buffer, orderNo?: string): Promise<Buffer> {
  const { width = 800, height = 600 } = await sharp(input).metadata();

  const now = new Date();
  const timeStr = now.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const watermarkText = orderNo ? `${orderNo} ${timeStr}` : timeStr;

  // SVG 文本覆盖层，右下角居右对齐，带半透明黑色描边增强可读性
  const fontSize = Math.max(16, Math.round(width * 0.025));
  const padding = Math.round(fontSize * 0.8);
  const svgWatermark = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <text
      x="${width - padding}" y="${height - padding}"
      text-anchor="end"
      font-size="${fontSize}"
      font-family="Arial, sans-serif"
      fill="rgba(255,255,255,0.85)"
      stroke="rgba(0,0,0,0.5)"
      stroke-width="1"
    >${watermarkText}</text>
  </svg>`;

  return sharp(input)
    .composite([{ input: Buffer.from(svgWatermark), top: 0, left: 0 }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  /**
   * 上传服务类型图标（无水印）
   * 图片会自动纠正方向，并在不放大的前提下约束到 512×512 以内。
   */
  @Post('icon')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ICON_FILE_SIZE },
    }),
  )
  @ApiOperation({
    summary: '上传服务类型图标（无水印）',
    description: '接受服务类型图标，压缩为最大 512×512 的 WebP 后存储，返回可访问 URL',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '服务类型图标（JPEG/PNG/WebP，≤1MB）',
        },
      },
      required: ['file'],
    },
  })
  async uploadIcon(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ code: number; message: string; data: UploadImageResponseDto }> {
    if (!file) {
      throw new BadRequestException('未接收到文件，请确认请求包含 file 字段');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文件类型 ${file.mimetype}，仅允许 JPEG / PNG / WebP`,
      );
    }
    if (file.size > MAX_ICON_FILE_SIZE) {
      throw new BadRequestException('服务图标大小不能超过 1MB');
    }

    this.logger.log(
      `Uploading service icon: originalName=${file.originalname}, size=${file.size}`,
    );

    let iconBuffer: Buffer;
    try {
      iconBuffer = await sharp(file.buffer)
        .rotate()
        .resize({
          width: 512,
          height: 512,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 90, alphaQuality: 100 })
        .toBuffer();
    } catch {
      throw new BadRequestException('图片内容无效或已损坏');
    }

    const filename = buildIconFilename();
    const url = await this.storageService.save(filename, iconBuffer);

    this.logger.log(`Service icon uploaded successfully: ${url}`);

    return {
      code: 0,
      message: 'ok',
      data: { url, filename },
    };
  }

  /**
   * 上传价格表海报（无水印，保留长图比例）
   */
  @Post('poster')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiOperation({
    summary: '上传价格表海报（无水印）',
    description: '接受长图海报，按宽度约束到 1200 以内后存储，返回可访问 URL',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '价格表海报（JPEG/PNG/WebP，≤10MB）',
        },
      },
      required: ['file'],
    },
  })
  async uploadPoster(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ code: number; message: string; data: UploadImageResponseDto }> {
    if (!file) {
      throw new BadRequestException('未接收到文件，请确认请求包含 file 字段');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文件类型 ${file.mimetype}，仅允许 JPEG / PNG / WebP`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('价格海报大小不能超过 10MB');
    }

    this.logger.log(
      `Uploading price poster: originalName=${file.originalname}, size=${file.size}`,
    );

    let posterBuffer: Buffer;
    try {
      posterBuffer = await sharp(file.buffer)
        .rotate()
        .resize({
          width: 1200,
          withoutEnlargement: true,
        })
        .webp({ quality: 85, alphaQuality: 100 })
        .toBuffer();
    } catch {
      throw new BadRequestException('图片内容无效或已损坏');
    }

    const filename = buildPosterFilename();
    const url = await this.storageService.save(filename, posterBuffer);

    this.logger.log(`Price poster uploaded successfully: ${url}`);

    return {
      code: 0,
      message: 'ok',
      data: { url, filename },
    };
  }

  /**
   * 上传图片（自动叠加水印）
   * 接受 multipart/form-data，字段：file（图片）+ orderNo（可选，写入水印）
   * 返回可访问的图片 URL（本地开发模式为 http://localhost:3000/uploads/xxx.jpg）
   */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiOperation({ summary: '上传图片（含水印）', description: '接受图片文件，叠加订单号和时间戳水印后存储，返回可访问 URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: '图片文件（JPEG/PNG/WebP，≤10MB）' },
        orderNo: { type: 'string', description: '订单号（可选），写入水印' },
      },
      required: ['file'],
    },
  })
  @ApiQuery({ name: 'orderNo', required: false, description: '订单号（也可通过 query 传递）' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('orderNo') orderNoQuery?: string,
  ): Promise<{ code: number; message: string; data: UploadImageResponseDto }> {
    if (!file) {
      throw new BadRequestException('未接收到文件，请确认请求包含 file 字段');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文件类型 ${file.mimetype}，仅允许 JPEG / PNG / WebP`,
      );
    }

    const orderNo = orderNoQuery;

    this.logger.log(
      `Uploading image: originalName=${file.originalname}, size=${file.size}, orderNo=${orderNo ?? 'none'}`,
    );

    // 添加水印
    const watermarkedBuffer = await addWatermark(file.buffer, orderNo);

    // 生成唯一文件名并存储
    const filename = buildFilename(orderNo);
    const url = await this.storageService.save(filename, watermarkedBuffer);

    this.logger.log(`Image uploaded successfully: ${url}`);

    return {
      code: 0,
      message: 'ok',
      data: { url, filename },
    };
  }

  /**
   * 通过 API 路径读取已上传图片。
   * 小程序 request 合法域名通常只配了 /api，Nginx 可能未转发 /uploads，
   * 用这条接口与 JSON API 走同一前缀，避免图片 404。
   */
  @Get('file/:filename')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({ summary: '读取已上传图片' })
  serveFile(@Param('filename') filename: string): StreamableFile {
    if (!/^[A-Za-z0-9._-]+$/.test(filename)) {
      throw new BadRequestException('非法文件名');
    }
    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('文件不存在');
    }
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
            ? 'image/gif'
            : 'image/jpeg';
    return new StreamableFile(fs.createReadStream(filePath), {
      type: mime,
      disposition: `inline; filename="${filename}"`,
    });
  }
}
