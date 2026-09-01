-- AlterTable
ALTER TABLE `recycling_orders`
    ADD COLUMN `selected_items` JSON NULL,
    ADD COLUMN `has_elevator` BOOLEAN NULL,
    ADD COLUMN `carry_floor` INTEGER NULL;
