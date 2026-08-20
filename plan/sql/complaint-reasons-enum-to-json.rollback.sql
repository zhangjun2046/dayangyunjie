-- 回滚：complaints.reasons (JSON 数组) → complaints.reason (ENUM)
-- 仅当 JSON_LENGTH(reasons)=1 且码仍在原 6 个 ENUM 内时安全。
-- 多选上线后若已有多元素数组，本脚本无法完整回写，执行前请确认。
-- 来源：plan/complaint-reasons-multi-select.md §3.2

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
SET `reason` = JSON_UNQUOTE(JSON_EXTRACT(`reasons`, '$[0]'))
WHERE JSON_LENGTH(`reasons`) = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(`reasons`, '$[0]')) IN (
    'POOR_ATTITUDE',
    'NOT_CLEAN',
    'NOT_ON_TIME',
    'ITEM_DAMAGED',
    'EXTRA_CHARGE',
    'OTHER'
  );

-- 若仍有 reason IS NULL 的行（多选数据），先人工处理后再执行下面两步。
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
