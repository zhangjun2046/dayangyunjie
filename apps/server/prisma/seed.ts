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

/** 保洁与废品回收初始评价关键词，可在管理端分别调整 */
const reviewKeywordSeed = ['准时到达', '打扫干净', '态度好', '专业细致', '工具齐全', '着装整齐'].flatMap(
  (keyword, index) =>
    ['CLEANING', 'RECYCLING'].map((bizType) => ({
      bizType,
      keyword,
      sortOrder: index + 1,
      isEnabled: true,
    })),
);

/** 小件回收品项（对齐稿面；表为空才插入） */
const smallRecyclingItemSeed = [
  { name: '纸张', priceText: '0.6元/kg', sortOrder: 1 },
  { name: '金属', priceText: '1元/kg', sortOrder: 2 },
  { name: '塑料', priceText: '0.6元/kg', sortOrder: 3 },
  { name: '织物', priceText: '0.2元/kg', sortOrder: 4 },
  { name: '小家电', priceText: '1.5元/kg', sortOrder: 5 },
  { name: '一袋式', priceText: '0.6元/kg', sortOrder: 6 },
] as const;

/** 大件回收品项（对齐稿面胶囊；无稿面单价用面议） */
const largeRecyclingItemSeed = [
  { name: '单门柜', priceText: '面议', sortOrder: 1 },
  { name: '双门柜', priceText: '面议', sortOrder: 2 },
  { name: '三门及以上柜', priceText: '面议', sortOrder: 3 },
  { name: '单人沙发', priceText: '面议', sortOrder: 4 },
  { name: '双人沙发', priceText: '面议', sortOrder: 5 },
  { name: '三人及以上沙发', priceText: '面议', sortOrder: 6 },
  { name: '椅子', priceText: '面议', sortOrder: 7 },
  { name: '茶几', priceText: '面议', sortOrder: 8 },
  { name: '餐桌', priceText: '面议', sortOrder: 9 },
  { name: '写字台', priceText: '面议', sortOrder: 10 },
  { name: '单人无簧垫', priceText: '面议', sortOrder: 11 },
  { name: '双人无簧垫', priceText: '面议', sortOrder: 12 },
  { name: '单人弹簧垫', priceText: '面议', sortOrder: 13 },
  { name: '双人弹簧垫', priceText: '面议', sortOrder: 14 },
] as const;

/** 默认投诉原因；仅在配置表为空时整体初始化 */
const complaintReasonConfigSeed = [
  { label: '服务态度差', sortOrder: 1, isEnabled: true },
  { label: '打扫不干净', sortOrder: 2, isEnabled: true },
  { label: '未按约定时间到达', sortOrder: 3, isEnabled: true },
  { label: '物品损坏/丢失', sortOrder: 4, isEnabled: true },
  { label: '额外收费', sortOrder: 5, isEnabled: true },
  { label: '其他原因', sortOrder: 6, isEnabled: true },
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

  // ─── RecyclingItem（表为空才插入，不覆盖运营已改金额） ─────────────────────
  const existingRecyclingItemCount = await prisma.recyclingItem.count();
  if (existingRecyclingItemCount === 0) {
    const largeCatalog = await prisma.serviceCatalog.findFirst({
      where: { bizType: 'RECYCLING', name: { contains: '大件' } },
    });
    const smallCatalog = await prisma.serviceCatalog.findFirst({
      where: { bizType: 'RECYCLING', name: { contains: '小件' } },
    });

    if (!largeCatalog) {
      console.info('[seed] RecyclingItem skipped large group: no RECYCLING catalog matching 大件');
    } else {
      await prisma.recyclingItem.createMany({
        data: largeRecyclingItemSeed.map((row) => ({
          catalogId: largeCatalog.id,
          name: row.name,
          priceText: row.priceText,
          sortOrder: row.sortOrder,
          isEnabled: true,
        })),
      });
      console.info(
        `[seed] RecyclingItem created under ${largeCatalog.name}: ${largeRecyclingItemSeed.length} rows`,
      );
    }

    if (!smallCatalog) {
      console.info('[seed] RecyclingItem skipped small group: no RECYCLING catalog matching 小件');
    } else {
      await prisma.recyclingItem.createMany({
        data: smallRecyclingItemSeed.map((row) => ({
          catalogId: smallCatalog.id,
          name: row.name,
          priceText: row.priceText,
          sortOrder: row.sortOrder,
          isEnabled: true,
        })),
      });
      console.info(
        `[seed] RecyclingItem created under ${smallCatalog.name}: ${smallRecyclingItemSeed.length} rows`,
      );
    }
  } else {
    console.info(
      `[seed] RecyclingItem skipped (${existingRecyclingItemCount} rows already exist)`,
    );
  }

  // ─── ReviewKeyword ─────────────────────────────────────────────────────────
  for (const row of reviewKeywordSeed) {
    await prisma.reviewKeyword.upsert({
      where: {
        bizType_keyword: {
          bizType: row.bizType,
          keyword: row.keyword,
        },
      },
      update: {},
      create: row,
    });
  }
  console.info(`[seed] ReviewKeyword upserted: ${reviewKeywordSeed.length} rows`);

  // ─── ComplaintReasonConfig ─────────────────────────────────────────────────
  const existingComplaintReasonCount = await prisma.complaintReasonConfig.count();
  if (existingComplaintReasonCount === 0) {
    await prisma.complaintReasonConfig.createMany({
      data: complaintReasonConfigSeed.map((row) => ({ ...row })),
    });
    console.info(
      `[seed] ComplaintReasonConfig created: ${complaintReasonConfigSeed.length} rows`,
    );
  } else {
    console.info(
      `[seed] ComplaintReasonConfig skipped (${existingComplaintReasonCount} rows already exist)`,
    );
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
