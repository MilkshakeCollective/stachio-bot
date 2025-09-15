import { MilkshakeClient, setGuildLanguage } from '../../index.js';
import { EventInterface } from '../../types.js';
import { logger, installGuild } from '../../components/exports.js';
import { ActivityType, Events } from 'discord.js';
import { WatchdogStatus } from '@prisma/client';

const event: EventInterface = {
	name: Events.ClientReady,
	options: { once: true, rest: false },
	execute: async (client: MilkshakeClient) => {
		logger.info('Client Ready.');

		let currentIndex = 0;

		const updatePresence = async () => {
			const blockedUsers = await client.prisma.users.count({
				where: {
					status: {
						in: [WatchdogStatus.BLOCKED, WatchdogStatus.PERM_BLOCKED, WatchdogStatus.AUTO_BLOCKED],
					},
				},
			});

			const presences = [
				{ name: '/help | stachio.dk', type: ActivityType.Listening },
				{ name: '🛡️ Monitoring servers for threats', type: ActivityType.Watching },
				{ name: '🔍 Scanning communities for safety', type: ActivityType.Playing },
				{ name: `🚫 ${blockedUsers} blocked users this week`, type: ActivityType.Watching },
				{ name: '⚡ Keeping your server safe 24/7', type: ActivityType.Competing },
				{ name: '📈 Tracking suspicious activity', type: ActivityType.Playing },
				{ name: '💬 /help to interact with me', type: ActivityType.Listening },
				{ name: '🔒 Security is my middle name', type: ActivityType.Watching },
				{ name: '👀 Watching over your guilds', type: ActivityType.Playing },
				{ name: `🚨 Stay safe! ${blockedUsers} users blocked`, type: ActivityType.Watching },
			];

			const presence = presences[currentIndex];
			client.user?.setPresence({
				activities: [presence],
				status: 'online',
			});

			currentIndex = (currentIndex + 1) % presences.length;
		};

		// Start with the first presence
		updatePresence();

		// Rotate every minute
		setInterval(updatePresence, 30 * 1000);

		// Guild initialization
		for (const [, guild] of client.guilds.cache) {
			try {
				const installedGuild = await installGuild(client, guild.id, 'en-US');
				await setGuildLanguage(guild.id, installedGuild.language);
			} catch (err) {
				logger.error(`❌ Failed to ensure guild config for ${guild.name} (${guild.id}): ${err}`);
			}
		}

		// Cleanup old verification attempts
		const cleanupOldAttempts = async () => {
			const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
			await client.prisma.verificationAttempt.deleteMany({
				where: {
					lastTriedAt: { lt: twentyFourHoursAgo },
				},
			});
			logger.info('✅ Old verification attempts cleaned up');
		};

		setInterval(cleanupOldAttempts, 24 * 60 * 60 * 1000);
	},
};

export default event;
