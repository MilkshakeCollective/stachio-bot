/*
  Warnings:

  - You are about to drop the `AntiPhishSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FlaggedSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GuildSettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `FlaggedSettings` DROP FOREIGN KEY `FlaggedSettings_guildId_fkey`;

-- DropTable
DROP TABLE `AntiPhishSettings`;

-- DropTable
DROP TABLE `FlaggedSettings`;

-- DropTable
DROP TABLE `GuildSettings`;

-- CreateTable
CREATE TABLE `GuildConfig` (
    `guildId` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'EN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`guildId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WatchdogConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(191) NOT NULL,
    `actionOnFlag` ENUM('WARN', 'KICK', 'BAN', 'ROLE') NOT NULL DEFAULT 'KICK',
    `actionOnPerm` ENUM('WARN', 'KICK', 'BAN', 'ROLE') NOT NULL DEFAULT 'KICK',
    `actionOnAuto` ENUM('WARN', 'KICK', 'BAN', 'ROLE') NOT NULL DEFAULT 'ROLE',
    `roleId` VARCHAR(191) NULL,
    `logChannelId` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WatchdogConfig_guildId_key`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AntiPhishingConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `ignoredRoles` JSON NOT NULL,
    `ignoredUsers` JSON NOT NULL,
    `ignoredChannels` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AntiPhishingConfig_guildId_key`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationConfig` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `kickOnFail` BOOLEAN NOT NULL DEFAULT true,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `timeoutSeconds` INTEGER NOT NULL DEFAULT 43200,
    `logsChannelId` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NULL,
    `verifiedRoleIds` JSON NOT NULL,
    `emojiCategory` VARCHAR(191) NOT NULL DEFAULT 'colors',
    `emojis` JSON NOT NULL,
    `correctEmoji` VARCHAR(191) NOT NULL DEFAULT '',
    `dmOnSuccess` BOOLEAN NOT NULL DEFAULT true,
    `dmOnFailure` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VerificationConfig_guildId_key`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `lastTriedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verificationConfigId` VARCHAR(191) NULL,

    UNIQUE INDEX `VerificationAttempt_guildId_userId_key`(`guildId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WatchdogConfig` ADD CONSTRAINT `WatchdogConfig_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildConfig`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AntiPhishingConfig` ADD CONSTRAINT `AntiPhishingConfig_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildConfig`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationConfig` ADD CONSTRAINT `VerificationConfig_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildConfig`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationAttempt` ADD CONSTRAINT `VerificationAttempt_verificationConfigId_fkey` FOREIGN KEY (`verificationConfigId`) REFERENCES `VerificationConfig`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
