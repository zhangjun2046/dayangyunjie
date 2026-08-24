import './load-env';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaService } from './common/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 静态资源：本地开发时 /uploads/* → apps/server/uploads/ 目录
  const uploadsDir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // CORS - 本地开发放行 localhost；测试/生产通过 CORS_ORIGIN 追加公网地址（逗号分隔）
  const extraOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        extraOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  });

  // 全局路径前缀
  app.setGlobalPrefix('api/v1');

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger 文档（预留，后续单元填充 DTO 后自动展示）
  const config = new DocumentBuilder()
    .setTitle('大洋云洁 API')
    .setDescription('大洋云洁 · 智享社区综合服务平台 REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log('🚀 大洋云洁 Server is running on http://localhost:3000');
  console.log('📖 Swagger docs at http://localhost:3000/api/docs');

  await seedRecyclingCatalogs(app);
}

/**
 * 启动时自动写入废品回收服务目录种子数据（幂等，已存在则跳过）
 * 对应 POST /api/v1/service-catalogs 接口的数据初始化
 */
async function seedRecyclingCatalogs(app: NestExpressApplication) {
  const prisma = app.get(PrismaService);

  const items = [
    {
      bizType: 'RECYCLING',
      name: '大件类废品',
      subtitle: '大家电、家具',
      icon: '🚚',
      sortOrder: 1,
    },
    {
      bizType: 'RECYCLING',
      name: '小件类废品',
      subtitle: '书箱纸箱、塑料瓶、废金属、小家电',
      icon: '📦',
      sortOrder: 2,
    },
  ];

  for (const item of items) {
    const exists = await prisma.serviceCatalog.findFirst({
      where: { bizType: item.bizType, name: item.name },
    });
    if (!exists) {
      await prisma.serviceCatalog.create({ data: item });
      console.info(`[seed] ServiceCatalog created: ${item.name}`);
    } else {
      console.info(`[seed] ServiceCatalog exists, skip: ${item.name}`);
    }
  }
}

bootstrap();
