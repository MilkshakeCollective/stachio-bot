-- CreateTable
CREATE TABLE `GuildSettings` (
    `guildId` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'EN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`guildId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `last_username` VARCHAR(191) NULL,
    `last_avatar` VARCHAR(191) NULL,
    `status` ENUM('APPEALED', 'FLAGGED', 'PERM_FLAGGED', 'AUTO_FLAGGED') NOT NULL DEFAULT 'FLAGGED',
    `reason` VARCHAR(191) NULL,
    `evidence` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Users_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Appeal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'DENIED') NOT NULL DEFAULT 'PENDING',
    `reason` VARCHAR(191) NULL,
    `moderatorResponse` VARCHAR(191) NOT NULL DEFAULT 'Awaiting Response',
    `moderator` VARCHAR(191) NOT NULL DEFAULT 'Awaiting Response',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FlaggedSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(191) NOT NULL,
    `actionOnFlag` ENUM('WARN', 'KICK', 'BAN', 'ROLE') NOT NULL DEFAULT 'KICK',
    `actionOnPerm` ENUM('WARN', 'KICK', 'BAN', 'ROLE') NOT NULL DEFAULT 'KICK',
    `actionOnAuto` ENUM('WARN', 'KICK', 'BAN', 'ROLE') NOT NULL DEFAULT 'KICK',
    `roleId` VARCHAR(191) NULL,
    `logChannelId` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FlaggedSettings_guildId_key`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AntiPhishSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `ignoredRoles` JSON NOT NULL,
    `ignoredUsers` JSON NOT NULL,
    `ignoredChannels` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AntiPhishSettings_guildId_key`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Appeal` ADD CONSTRAINT `Appeal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FlaggedSettings` ADD CONSTRAINT `FlaggedSettings_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `GuildSettings`(`guildId`) ON DELETE CASCADE ON UPDATE CASCADE;
