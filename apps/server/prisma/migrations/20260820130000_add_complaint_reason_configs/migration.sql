-- CreateTable
CREATE TABLE `complaint_reason_configs` (
    `code` ENUM(
        'POOR_ATTITUDE',
        'NOT_CLEAN',
        'NOT_ON_TIME',
        'ITEM_DAMAGED',
        'EXTRA_CHARGE',
        'OTHER'
    ) NOT NULL,
    `label` VARCHAR(32) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `complaint_reason_configs_is_enabled_sort_order_idx`
    ON `complaint_reason_configs`(`is_enabled`, `sort_order`);

-- Initialize the fixed reason codes during deployment. Production migration
-- workflows do not necessarily execute prisma seed.
INSERT INTO `complaint_reason_configs`
    (`code`, `label`, `sort_order`, `is_enabled`, `created_at`, `updated_at`)
VALUES
    ('POOR_ATTITUDE', '服务态度差', 1, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('NOT_CLEAN', '打扫不干净', 2, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('NOT_ON_TIME', '未按约定时间到达', 3, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('ITEM_DAMAGED', '物品损坏/丢失', 4, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('EXTRA_CHARGE', '额外收费', 5, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('OTHER', '其他原因', 6, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
