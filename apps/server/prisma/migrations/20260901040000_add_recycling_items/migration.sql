-- CreateTable
CREATE TABLE `recycling_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `catalog_id` INTEGER NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `price_text` VARCHAR(32) NOT NULL,
    `icon` VARCHAR(512) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `recycling_items_catalog_id_name_key`(`catalog_id`, `name`),
    INDEX `recycling_items_catalog_id_is_enabled_sort_order_idx`(`catalog_id`, `is_enabled`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recycling_items` ADD CONSTRAINT `recycling_items_catalog_id_fkey` FOREIGN KEY (`catalog_id`) REFERENCES `service_catalogs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
