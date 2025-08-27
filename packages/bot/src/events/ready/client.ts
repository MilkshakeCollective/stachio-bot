import { MilkshakeClient } from '../../index.js';
import { EventInterface } from '../../types.js';
import { logger, installGuild, sendWatchdogReport } from '../../components/exports.js';
import { ActivityType, Events } from 'discord.js';
import cron from 'node-cron';

const event: EventInterface = {
	name: Events.ClientReady,
	options: { once: true, rest: false },
	execute: async (client: MilkshakeClient) => {
		logger.info('Client Ready.');

		// Set bot presence
		client.user?.setPresence({
			activities: [
				{
					name: '/help | Donate: ko-fi.com/duckodas',
					type: ActivityType.Listening,
				},
			],
			status: 'online',
		});

		for (const [, guild] of client.guilds.cache) {
			try {
				await installGuild(client, guild.id);
				logger.info(`✅ Guild settings ensured for ${guild.name} (${guild.id})`);
			} catch (err) {
				logger.error(`❌ Failed to ensure guild settings for ${guild.name} (${guild.id}): ${err}`);
			}
		}

		// Cleanup old denied appeals older than 14 days
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

		// Run cleanup once a day
		setInterval(cleanupOldAppeals, 24 * 60 * 60 * 1000);

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
