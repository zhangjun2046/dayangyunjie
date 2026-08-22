-- Add the future numeric key while the legacy code remains the primary key.
-- The temporary unique index satisfies MySQL's AUTO_INCREMENT key requirement.
ALTER TABLE `complaint_reason_configs`
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD UNIQUE INDEX `complaint_reason_configs_id_migration_key`(`id`),
    ADD UNIQUE INDEX `complaint_reason_configs_label_key`(`label`);

-- Add the nullable relation first so this migration also works when complaints is empty.
-- reason_label becomes NOT NULL only after every legacy row has been backfilled.
ALTER TABLE `complaints`
    ADD COLUMN `reason_config_id` INTEGER NULL,
    ADD COLUMN `reason_label` VARCHAR(32) NULL;

-- Preserve both the current configuration identity and its current display label.
UPDATE `complaints` AS `complaint`
INNER JOIN `complaint_reason_configs` AS `reason_config`
    ON `reason_config`.`code` = `complaint`.`reason`
SET
    `complaint`.`reason_config_id` = `reason_config`.`id`,
    `complaint`.`reason_label` = `reason_config`.`label`;

-- All six legacy enum values were initialized by the preceding migration, so every
-- existing complaint must now have a label snapshot. Keeping the relation nullable
-- allows a configuration to be deleted without deleting complaint history.
ALTER TABLE `complaints`
    MODIFY COLUMN `reason_label` VARCHAR(32) NOT NULL;

-- Promote the numeric key before removing the legacy code.
ALTER TABLE `complaint_reason_configs`
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `complaints`
    DROP COLUMN `reason`,
    ADD INDEX `complaints_reason_config_id_idx`(`reason_config_id`);

ALTER TABLE `complaint_reason_configs`
    DROP COLUMN `code`,
    DROP INDEX `complaint_reason_configs_id_migration_key`;

ALTER TABLE `complaints`
    ADD CONSTRAINT `complaints_reason_config_id_fkey`
    FOREIGN KEY (`reason_config_id`)
    REFERENCES `complaint_reason_configs`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
