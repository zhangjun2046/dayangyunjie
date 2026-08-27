-- 回滚：删除员工在职/离职字段（仅应急；回滚前确认无业务依赖该字段）
DROP INDEX `workers_employment_status_idx` ON `workers`;
ALTER TABLE `workers` DROP COLUMN `employment_status`;
