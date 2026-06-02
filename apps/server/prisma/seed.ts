import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** 默认管理员密码（仅开发种子，生产须修改） */
const ADMIN_DEFAULT_PASSWORD = 'Admin@123';

const serviceCatalogSeed = [
  {
    bizType: 'CLEANING',
    serviceItem: '日常清扫',
    priceMin: 35,
    priceMax: 45,
    priceUnit: '元/小时',
    description: '地面、桌面、卫生间基础清洁',
    sortOrder: 1,
  },
  {
    bizType: 'CLEANING',
    serviceItem: '深度清扫',
    priceMin: 50,
    priceMax: 80,
    priceUnit: '元/小时',
    description: '厨房油烟、卫生间水垢深度去除（上门核定）',
    sortOrder: 2,
  },
  {
    bizType: 'CLEANING',
    serviceItem: '专项清洁',
    priceMin: 0,
    priceMax: 0,
    priceUnit: '按项目报价',
    description: '搬家清洁、开荒保洁（上门核定）',
    sortOrder: 3,
  },
  {
    bizType: 'RECYCLING',
    serviceItem: '大件类',
    priceMin: 0,
    priceMax: 0,
    priceUnit: '上门核定',
    description: '大家电、家具回收，需搬运工上门',
    sortOrder: 1,
  },
  {
    bizType: 'RECYCLING',
    serviceItem: '小件类',
    priceMin: 0,
    priceMax: 0,
    priceUnit: '上门核定',
    description: '书籍纸箱、塑料瓶、废金属、小家电',
    sortOrder: 2,
  },
  {
    bizType: 'CONSULT',
    serviceItem: '保姆',
    priceMin: 5000,
    priceMax: 8000,
    priceUnit: '元/月',
    description: '住家保姆服务（具体价格上门核定）',
    sortOrder: 1,
  },
  {
    bizType: 'CONSULT',
    serviceItem: '月嫂',
    priceMin: 8000,
    priceMax: 15000,
    priceUnit: '元/月',
    description: '产后母婴护理（具体价格上门核定）',
    sortOrder: 2,
  },
  {
    bizType: 'CONSULT',
    serviceItem: '育儿嫂',
    priceMin: 5000,
    priceMax: 8000,
    priceUnit: '元/月',
    description: '婴幼儿照护（具体价格上门核定）',
    sortOrder: 3,
  },
  {
    bizType: 'CONSULT',
    serviceItem: '陪诊',
    priceMin: 200,
    priceMax: 500,
    priceUnit: '元/次',
    description: '陪同就医服务',
    sortOrder: 4,
  },
  {
    bizType: 'CONSULT',
    serviceItem: '代买菜',
    priceMin: 20,
    priceMax: 50,
    priceUnit: '元/次',
    description: '代购食材上门',
    sortOrder: 5,
  },
] as const;

async function main() {
  console.info('[seed] Starting database seed...');

  const passwordHash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 10);

  await prisma.admin.upsert({
    where: { email: 'admin@dayunyunjie.com' },
    update: { passwordHash, name: '管理员' },
    create: {
      email: 'admin@dayunyunjie.com',
      passwordHash,
      name: '管理员',
    },
  });
  console.info('[seed] Admin upserted: admin@dayunyunjie.com');

  const existingCount = await prisma.serviceCatalog.count();
  if (existingCount === 0) {
    await prisma.serviceCatalog.createMany({
      data: serviceCatalogSeed.map((row) => ({
        ...row,
        isActive: true,
      })),
    });
    console.info(`[seed] ServiceCatalog created: ${serviceCatalogSeed.length} rows`);
  } else {
    console.info(`[seed] ServiceCatalog skipped (${existingCount} rows already exist)`);
  }

  console.info('[seed] Done.');
}

main()
  .catch((e) => {
    console.error('[seed] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
