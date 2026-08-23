-- 合并升级：把 master 形态的库一次性升到 dev/mac-zhangshuo 合并后的最终结构。
-- 适用对象：生产库 / 任何仍是 master schema 的库（complaints.reason 为 ENUM，
--           无 review_keywords、无 complaint_reason_configs、无 workers.skill_cert_urls）。
-- 不要与 `npx prisma migrate deploy` 重复执行。二选一：
--   A) 只跑本文件，再执行文末「基线 _prisma_migrations」；
--   B) 不跑本文件，只跑 `npx prisma migrate deploy`（同事 3 个 + 新增 2 个）。
-- 覆盖范围（git diff origin/master...HEAD -- apps/server/prisma/schema.prisma）：
--   1) review_keywords 评价关键词表
--   2) complaint_reason_configs 投诉原因配置表（最终形态：id 主键 + label 唯一）
--   3) complaints.reason ENUM → reasons JSON 快照 [{configId,label}]
--   4) workers.skill_cert_urls JSON（技能证书多图）
-- 服务类型 icon 字段在 master 已存在，无需变更。
-- 旧脚本 plan/sql/complaint-reasons-enum-to-json.sql 已失效，勿再执行。
-- 执行前请备份。

-- ──────────────────────────────────────────────
-- 1. 评价关键词
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `review_keywords` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `biz_type` VARCHAR(16) NOT NULL,
    `keyword` VARCHAR(32) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `review_keywords_biz_type_keyword_key`(`biz_type`, `keyword`),
    INDEX `review_keywords_biz_type_is_enabled_sort_order_idx`(`biz_type`, `is_enabled`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- 2. 投诉原因配置（直接建成最终形态，不走中间的 code ENUM / 外键）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `complaint_reason_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(32) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `complaint_reason_configs_label_key`(`label`),
    INDEX `complaint_reason_configs_is_enabled_sort_order_idx`(`is_enabled`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `complaint_reason_configs`
    (`label`, `sort_order`, `is_enabled`, `created_at`, `updated_at`)
SELECT v.label, v.sort_order, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM (
    SELECT '服务态度差' AS label, 1 AS sort_order
    UNION ALL SELECT '打扫不干净', 2
    UNION ALL SELECT '未按约定时间到达', 3
    UNION ALL SELECT '物品损坏/丢失', 4
    UNION ALL SELECT '额外收费', 5
    UNION ALL SELECT '其他原因', 6
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM `complaint_reason_configs` c WHERE c.label = v.label
);

-- ──────────────────────────────────────────────
-- 3. 投诉原因：ENUM → JSON 快照
--    历史单选按配置表 label 转成单元素数组；无匹配时仍落一条 label=原枚举值。
--    不考虑多选历史（master 只有单值）。
-- ──────────────────────────────────────────────
ALTER TABLE `complaints`
    ADD COLUMN `reasons` JSON NULL COMMENT '投诉原因快照 [{configId,label}]' AFTER `service_address`;

UPDATE `complaints` AS c
LEFT JOIN `complaint_reason_configs` AS cfg
    ON cfg.label = CASE c.reason
        WHEN 'POOR_ATTITUDE' THEN '服务态度差'
        WHEN 'NOT_CLEAN' THEN '打扫不干净'
        WHEN 'NOT_ON_TIME' THEN '未按约定时间到达'
        WHEN 'ITEM_DAMAGED' THEN '物品损坏/丢失'
        WHEN 'EXTRA_CHARGE' THEN '额外收费'
        WHEN 'OTHER' THEN '其他原因'
        ELSE NULL
    END
SET c.reasons = JSON_ARRAY(
    JSON_OBJECT(
        'configId', cfg.id,
        'label', COALESCE(cfg.label, c.reason)
    )
)
WHERE c.reasons IS NULL;

ALTER TABLE `complaints`
    MODIFY COLUMN `reasons` JSON NOT NULL COMMENT '投诉原因快照 [{configId,label}]';

ALTER TABLE `complaints`
    DROP COLUMN `reason`;

-- ──────────────────────────────────────────────
-- 4. 员工技能证书多图
-- ──────────────────────────────────────────────
ALTER TABLE `workers`
    ADD COLUMN `skill_cert_urls` JSON NULL AFTER `skill_cert_url`;

-- ──────────────────────────────────────────────
-- 5. 基线 Prisma（本文件升级后，避免再跑那 5 个 migration）
--    若生产打算只用 migrate deploy、不跑本文件，请整段跳过。
--    checksum 取自 2026-08-23 仓库内对应 migration.sql 的 SHA-256。
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
    `id` VARCHAR(36) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `migration_name` VARCHAR(255) NOT NULL,
    `logs` TEXT NULL,
    `rolled_back_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applied_steps_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_prisma_migrations`
    (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`)
SELECT * FROM (
    SELECT
        'b135e337-caad-4000-8000-000000000001' AS id,
        'b135e337caadcc0d274dae5370fab7b0bad6ba005626ba3a0c1747b76e5cea1c' AS checksum,
        CURRENT_TIMESTAMP(3) AS finished_at,
        '20260820073000_add_review_keywords' AS migration_name,
        NULL AS logs,
        NULL AS rolled_back_at,
        CURRENT_TIMESTAMP(3) AS started_at,
        1 AS applied_steps_count
    UNION ALL SELECT
        '116f2faa-c8d9-4000-8000-000000000002',
        '116f2faa7c8d959a244668cd39621785d4109f0d4c9aaf5fff6df9cca9fdee86',
        CURRENT_TIMESTAMP(3),
        '20260820130000_add_complaint_reason_configs',
        NULL, NULL, CURRENT_TIMESTAMP(3), 1
    UNION ALL SELECT
        'bfaa0a48-b80a-4000-8000-000000000003',
        'bfaa0a48b80a51f0e41f14fc1bb16ddc4dc5daba2525c53e8dcedecad35468bf',
        CURRENT_TIMESTAMP(3),
        '20260821160000_refactor_complaint_reason_relation',
        NULL, NULL, CURRENT_TIMESTAMP(3), 1
    UNION ALL SELECT
        'e17f3177-6920-4000-8000-000000000004',
        'e17f31776920d1ffcb33cff5cd09b525094524565c2f2d55ccc2ff6e805f3d16',
        CURRENT_TIMESTAMP(3),
        '20260823120000_complaint_reasons_json_snapshot',
        NULL, NULL, CURRENT_TIMESTAMP(3), 1
    UNION ALL SELECT
        'ff38794f-4ef1-4000-8000-000000000005',
        'ff38794f4ef1dad160d33df5537e4e297c039aabbc8fd68ce6d7651b2304c0ab',
        CURRENT_TIMESTAMP(3),
        '20260823120100_add_worker_skill_cert_urls',
        NULL, NULL, CURRENT_TIMESTAMP(3), 1
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM `_prisma_migrations` m WHERE m.migration_name = seed.migration_name
);
