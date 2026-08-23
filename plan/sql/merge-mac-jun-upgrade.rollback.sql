-- 回滚 merge-mac-jun-upgrade.sql，把库还原成 master 形态。
-- 投诉原因快照无法无损还原为 ENUM；按 label 反查枚举，对不上的行记为 OTHER。
-- 执行前请备份。

ALTER TABLE `workers`
    DROP COLUMN `skill_cert_urls`;

ALTER TABLE `complaints`
    ADD COLUMN `reason` ENUM(
        'POOR_ATTITUDE',
        'NOT_CLEAN',
        'NOT_ON_TIME',
        'ITEM_DAMAGED',
        'EXTRA_CHARGE',
        'OTHER'
    ) NULL AFTER `service_address`;

UPDATE `complaints`
SET `reason` = CASE JSON_UNQUOTE(JSON_EXTRACT(`reasons`, '$[0].label'))
    WHEN '服务态度差' THEN 'POOR_ATTITUDE'
    WHEN '打扫不干净' THEN 'NOT_CLEAN'
    WHEN '未按约定时间到达' THEN 'NOT_ON_TIME'
    WHEN '物品损坏/丢失' THEN 'ITEM_DAMAGED'
    WHEN '额外收费' THEN 'EXTRA_CHARGE'
    WHEN '其他原因' THEN 'OTHER'
    ELSE 'OTHER'
END;

ALTER TABLE `complaints`
    MODIFY COLUMN `reason` ENUM(
        'POOR_ATTITUDE',
        'NOT_CLEAN',
        'NOT_ON_TIME',
        'ITEM_DAMAGED',
        'EXTRA_CHARGE',
        'OTHER'
    ) NOT NULL;

ALTER TABLE `complaints`
    DROP COLUMN `reasons`;

DROP TABLE IF EXISTS `complaint_reason_configs`;
DROP TABLE IF EXISTS `review_keywords`;

DELETE FROM `_prisma_migrations`
WHERE `migration_name` IN (
    '20260820073000_add_review_keywords',
    '20260820130000_add_complaint_reason_configs',
    '20260821160000_refactor_complaint_reason_relation',
    '20260823120000_complaint_reasons_json_snapshot',
    '20260823120100_add_worker_skill_cert_urls'
);
