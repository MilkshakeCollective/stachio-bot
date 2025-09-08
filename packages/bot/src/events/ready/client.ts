import { MilkshakeClient, setGuildLanguage } from '../../index.js';
import { EventInterface } from '../../types.js';
import { logger, installGuild } from '../../components/exports.js';
import { ActivityType, Events } from 'discord.js';

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
				const installedGuild = await installGuild(client, guild.id, 'en-US');

				await setGuildLanguage(guild.id, installedGuild.language);

				logger.info(`✅ Guild config ensured for ${guild.name} (${guild.id})`);
			} catch (err) {
				logger.error(`❌ Failed to ensure guild config for ${guild.name} (${guild.id}): ${err}`);
			}
		}

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
				cleanupOldAttempts();
			},
			24 * 60 * 60 * 1000,
		);
	},
};

export default event;
