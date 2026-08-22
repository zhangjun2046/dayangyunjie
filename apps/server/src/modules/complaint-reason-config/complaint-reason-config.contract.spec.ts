import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_REASONS = [
  { label: '服务态度差', sortOrder: 1 },
  { label: '打扫不干净', sortOrder: 2 },
  { label: '未按约定时间到达', sortOrder: 3 },
  { label: '物品损坏/丢失', sortOrder: 4 },
  { label: '额外收费', sortOrder: 5 },
  { label: '其他原因', sortOrder: 6 },
] as const;

const prismaDir = resolve(__dirname, '../../../prisma');
const schema = readFileSync(resolve(prismaDir, 'schema.prisma'), 'utf8');
const seed = readFileSync(resolve(prismaDir, 'seed.ts'), 'utf8');
const legacyMigration = readFileSync(
  resolve(prismaDir, 'migrations/20260820130000_add_complaint_reason_configs/migration.sql'),
  'utf8',
);
const relationMigration = readFileSync(
  resolve(
    prismaDir,
    'migrations/20260821160000_refactor_complaint_reason_relation/migration.sql',
  ),
  'utf8',
);

function extractSeedRows(source: string) {
  const seedBody = source.match(/const complaintReasonConfigSeed\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1];
  if (!seedBody) throw new Error('complaintReasonConfigSeed not found');
  return [...seedBody.matchAll(
    /\{\s*label:\s*'([^']+)',\s*sortOrder:\s*(\d+),\s*isEnabled:\s*true\s*\}/g,
  )].map((match) => ({ label: match[1], sortOrder: Number(match[2]) }));
}

describe('ComplaintReasonConfig database static contract', () => {
  it('保留已应用迁移，后续迁移再移除旧 code 结构', () => {
    expect(legacyMigration).toContain('`code` ENUM(');
    expect(legacyMigration).toContain('PRIMARY KEY (`code`)');
    expect(relationMigration).toContain('DROP COLUMN `code`');
  });

  it('schema 使用自增配置主键、唯一标签和可空投诉关联', () => {
    expect(schema).not.toMatch(/enum ComplaintReason\s*\{/);
    expect(schema).toMatch(
      /model ComplaintReasonConfig\s*\{[\s\S]*?id\s+Int\s+@id\s+@default\(autoincrement\(\)\)/,
    );
    expect(schema).toMatch(/label\s+String\s+@unique\s+@db\.VarChar\(32\)/);
    expect(schema).toMatch(/reasonConfigId\s+Int\?\s+@map\("reason_config_id"\)/);
    expect(schema).toMatch(/reasonLabel\s+String\s+@map\("reason_label"\)\s+@db\.VarChar\(32\)/);
    expect(schema).toMatch(
      /reasonConfig\s+ComplaintReasonConfig\?\s+@relation\(fields:\s*\[reasonConfigId\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/,
    );
  });

  it('后续迁移先回填关联和快照，再删除旧字段并建立 SET NULL 外键', () => {
    const addColumnsAt = relationMigration.indexOf('ADD COLUMN `reason_config_id`');
    const backfillAt = relationMigration.indexOf('UPDATE `complaints`');
    const dropReasonAt = relationMigration.indexOf('DROP COLUMN `reason`');
    const dropCodeAt = relationMigration.indexOf('DROP COLUMN `code`');
    const addForeignKeyAt = relationMigration.indexOf('ADD CONSTRAINT `complaints_reason_config_id_fkey`');

    expect([addColumnsAt, backfillAt, dropReasonAt, dropCodeAt, addForeignKeyAt]).not.toContain(-1);
    expect(addColumnsAt).toBeLessThan(backfillAt);
    expect(backfillAt).toBeLessThan(dropReasonAt);
    expect(dropReasonAt).toBeLessThan(addForeignKeyAt);
    expect(dropCodeAt).toBeLessThan(addForeignKeyAt);
    expect(relationMigration).toMatch(
      /ON `reason_config`\.`code` = `complaint`\.`reason`[\s\S]*?`complaint`\.`reason_config_id` = `reason_config`\.`id`[\s\S]*?`complaint`\.`reason_label` = `reason_config`\.`label`/,
    );
    expect(relationMigration).toContain('MODIFY COLUMN `reason_label` VARCHAR(32) NOT NULL');
    expect(relationMigration).toContain('ADD PRIMARY KEY (`id`)');
    expect(relationMigration).toContain(
      'ADD UNIQUE INDEX `complaint_reason_configs_label_key`(`label`)',
    );
    expect(relationMigration).toMatch(/ON DELETE SET NULL\s+ON UPDATE CASCADE/);
  });

  it('seed 仅在配置表为空时 createMany 六条默认数据', () => {
    expect(extractSeedRows(seed)).toEqual(EXPECTED_REASONS);
    expect(seed).toMatch(
      /const existingComplaintReasonCount = await prisma\.complaintReasonConfig\.count\(\);/,
    );
    expect(seed).toMatch(
      /if \(existingComplaintReasonCount === 0\) \{[\s\S]*?prisma\.complaintReasonConfig\.createMany/,
    );
    expect(seed).not.toMatch(/prisma\.complaintReasonConfig\.upsert/);
    expect(seed).not.toMatch(/where:\s*\{\s*code:/);
  });
});
