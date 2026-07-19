import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** 默认管理员密码（仅开发种子，生产须修改） */
const ADMIN_DEFAULT_PASSWORD = 'admin123';

const serviceCatalogSeed = [
  // 保洁
  {
    bizType: 'CLEANING',
    name: '日常清扫',
    subtitle: '地面、桌面、卫生间基础清洁',
    sortOrder: 1,
    isEnabled: true,
  },
  {
    bizType: 'CLEANING',
    name: '深度清扫',
    subtitle: '厨房油烟、卫生间水垢深度去除',
    sortOrder: 2,
    isEnabled: true,
  },
  {
    bizType: 'CLEANING',
    name: '专项清洁',
    subtitle: '搬家清洁、开荒保洁',
    sortOrder: 3,
    isEnabled: true,
  },
  // 废品回收
  {
    bizType: 'RECYCLING',
    name: '大件类',
    subtitle: '大家电、家具',
    sortOrder: 1,
    isEnabled: true,
  },
  {
    bizType: 'RECYCLING',
    name: '小件类',
    subtitle: '书籍纸箱、塑料瓶、废金属、小家电',
    sortOrder: 2,
    isEnabled: true,
  },
  // 家政咨询
  {
    bizType: 'CONSULT',
    name: '保姆',
    subtitle: '日常家务、做饭、打扫卫生',
    sortOrder: 1,
    isEnabled: true,
  },
  {
    bizType: 'CONSULT',
    name: '月嫂',
    subtitle: '产妇护理与新生儿照护',
    sortOrder: 2,
    isEnabled: true,
  },
  {
    bizType: 'CONSULT',
    name: '育儿嫂',
    subtitle: '科学喂养、早教与宝宝日常照料',
    sortOrder: 3,
    isEnabled: true,
  },
  {
    bizType: 'CONSULT',
    name: '陪诊',
    subtitle: '陪同挂号、取药、检查、就诊',
    sortOrder: 4,
    isEnabled: true,
  },
  {
    bizType: 'CONSULT',
    name: '代买菜',
    subtitle: '按需求代买生鲜蔬菜送到家',
    sortOrder: 5,
    isEnabled: true,
  },
] as const;

async function main() {
  console.info('[seed] Starting database seed...');

  // ─── Admin ───────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 10);
  await prisma.admin.upsert({
    where: { email: 'admin@dayunyunjie.com' },
    update: { passwordHash, name: '管理员', username: 'admin', isSuperAdmin: true },
    create: {
      username: 'admin',
      email: 'admin@dayunyunjie.com',
      passwordHash,
      name: '管理员',
      isSuperAdmin: true,
    },
  });
  console.info('[seed] Admin upserted: admin@dayunyunjie.com (isSuperAdmin=true)');

  // ─── ServiceCatalog ───────────────────────────────────────────────────────
  const existingCatalogCount = await prisma.serviceCatalog.count();
  if (existingCatalogCount === 0) {
    await prisma.serviceCatalog.createMany({
      data: serviceCatalogSeed.map((row) => ({ ...row })),
    });
    console.info(`[seed] ServiceCatalog created: ${serviceCatalogSeed.length} rows`);
  } else {
    console.info(`[seed] ServiceCatalog skipped (${existingCatalogCount} rows already exist)`);
  }

  // ─── Operator（至少一条接单运营人员，居民端首页客服电话兜底） ──────────────
  const existingOperatorCount = await prisma.operator.count();
  if (existingOperatorCount === 0) {
    await prisma.operator.create({
      data: {
        name: '运营客服',
        phone: '13800138000',
        purpose: '接单',
      },
    });
    console.info('[seed] Operator created: 运营客服 (purpose=接单)');
  } else {
    console.info(`[seed] Operator skipped (${existingOperatorCount} rows already exist)`);
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
