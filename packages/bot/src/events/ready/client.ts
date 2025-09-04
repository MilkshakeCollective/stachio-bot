import { MilkshakeClient } from '../../index.js';
import { EventInterface } from '../../types.js';
import { logger, installGuild, sendWatchdogReport } from '../../components/exports.js';
import { ActivityType, Events } from 'discord.js';
import cron from 'node-cron';
import { ReportStatus } from '@prisma/client';

const event: EventInterface = {
	name: Events.ClientReady,
	options: { once: true, rest: false },
	execute: async (client: MilkshakeClient) => {
		logger.info('Client Ready.');

		client.user?.setPresence({
			activities: [
				{
					name: '/help | stachio.dk',
					type: ActivityType.Listening,
				},
			],
			status: 'online',
		});

		for (const [, guild] of client.guilds.cache) {
			try {
				// enforce upsert instead of relying only on installGuild
				await client.prisma.guildConfig.upsert({
					where: { guildId: guild.id },
					update: {},
					create: {
						guildId: guild.id,
						language: 'en-US',
					},
				});

				// optional: also run installGuild if you need additional setup logic
				await installGuild(client, guild.id);

				logger.info(`✅ Guild config ensured for ${guild.name} (${guild.id})`);
			} catch (err) {
				logger.error(`❌ Failed to ensure guild config for ${guild.name} (${guild.id}): ${err}`);
			}
		}

		const cleanupOldReports = async () => {
			const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

			await client.prisma.report.deleteMany({
				where: {
					status: ReportStatus.REJECTED ?? ReportStatus.RESOLVED,
					createdAt: { lt: ninetyDaysAgo },
				},
			});

			logger.info('✅ Old denied & resolved reports cleaned up');
		};

		const cleanupOldAppeals = async () => {
			const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

			await client.prisma.appeal.deleteMany({
				where: {
					status: 'DENIED',
					createdAt: { lt: fourteenDaysAgo },
				},
			});

			logger.info('✅ Old denied appeals cleaned up');
		};

		const cleanupOldAttempts = async () => {
			const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

			await client.prisma.verificationAttempt.deleteMany({
				where: {
					lastTriedAt: { lt: twentyFourHoursAgo },
				},
			});

			logger.info('✅ Old verification attempts cleaned up');
		};

		setInterval(
			() => {
				cleanupOldReports();
				cleanupOldAppeals();
				cleanupOldAttempts();
			},
			24 * 60 * 60 * 1000,
		);

		// Schedule weekly watchdog report every Friday at 00:00
		// CRON: '0 0 * * 5' for production, '* * * * *' for testing
		cron.schedule('0 0 * * 5', async () => {
			try {
				logger.info('📊 Sending weekly Watchdog report...');
				await sendWatchdogReport(client);
			} catch (err) {
				logger.error(`[WATCHDOG REPORT] Failed to send weekly report: ${err}`);
			}
		});
	},
};

export default event;
