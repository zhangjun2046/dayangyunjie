-- AlterTable: 员工新增在职/离职状态
ALTER TABLE `workers` ADD COLUMN `employment_status` ENUM('ACTIVE', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX `workers_employment_status_idx` ON `workers`(`employment_status`);
