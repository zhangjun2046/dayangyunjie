-- 员工表新增在职/离职状态（与 Prisma migration 20260827100000_add_worker_employment_status 语义一致）
-- 生产/测试机可手工执行本文件，或走 prisma migrate deploy（二选一，勿重复执行）

ALTER TABLE `workers`
  ADD COLUMN `employment_status` ENUM('ACTIVE', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX `workers_employment_status_idx` ON `workers`(`employment_status`);
