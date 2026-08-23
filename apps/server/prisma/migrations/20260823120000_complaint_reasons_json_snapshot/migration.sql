-- 投诉原因从「外键关联单个配置」改为「JSON 快照数组」，支持多选。
-- 存快照而非外键：配置后续改名或删除，都不影响历史投诉的展示。

-- 外键占用 complaints_reason_config_id_idx，必须先解约束再删索引。
ALTER TABLE `complaints`
    DROP FOREIGN KEY `complaints_reason_config_id_fkey`;

ALTER TABLE `complaints`
    DROP INDEX `complaints_reason_config_id_idx`;

-- MySQL 的 JSON 列不允许声明 DEFAULT，先建成可空，回填后再收紧为 NOT NULL。
ALTER TABLE `complaints`
    ADD COLUMN `reasons` JSON NULL;

-- 上一个 migration 已将 reason_label 回填齐全，这里原样转成单元素快照数组。
-- 配置被删除时 reason_config_id 会被置为 NULL，此时 configId 记 NULL，文案仍保留。
UPDATE `complaints`
SET `reasons` = JSON_ARRAY(
        JSON_OBJECT('configId', `reason_config_id`, 'label', `reason_label`)
    )
WHERE `reasons` IS NULL;

ALTER TABLE `complaints`
    MODIFY COLUMN `reasons` JSON NOT NULL;

ALTER TABLE `complaints`
    DROP COLUMN `reason_config_id`,
    DROP COLUMN `reason_label`;
