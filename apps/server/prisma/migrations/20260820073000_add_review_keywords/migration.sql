-- CreateTable
CREATE TABLE `review_keywords` (
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
