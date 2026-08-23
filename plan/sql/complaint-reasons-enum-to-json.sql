-- 【已失效】请改用 plan/sql/merge-mac-jun-upgrade.sql
-- 本文件只把 reason ENUM 转成字符串数组，与合并后的 [{configId,label}] 快照不兼容。
-- 投诉原因多选：complaints.reason (ENUM) → complaints.reasons (JSON 数组)
-- 来源：plan/complaint-reasons-multi-select.md §3
-- 执行前请备份 complaints 表
-- Prisma 对应 migration：apps/server/prisma/migrations/20260820000000_complaint_reasons_json/

-- 1. 新增可空 JSON 列
ALTER TABLE `complaints`
  ADD COLUMN `reasons` JSON NULL COMMENT '投诉原因 value 数组快照' AFTER `service_address`;

-- 2. 历史单值包成单元素数组
UPDATE `complaints`
SET `reasons` = JSON_ARRAY(`reason`)
WHERE `reasons` IS NULL AND `reason` IS NOT NULL;

-- 3. 设为非空
ALTER TABLE `complaints`
  MODIFY COLUMN `reasons` JSON NOT NULL COMMENT '投诉原因 value 数组快照';

-- 4. 删除旧 ENUM 列（MySQL ENUM 随列删除，无需再 DROP TYPE）
ALTER TABLE `complaints`
  DROP COLUMN `reason`;
