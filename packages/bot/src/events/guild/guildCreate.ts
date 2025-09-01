import { Guild, TextChannel } from 'discord.js';
import { EventInterface } from '../../types.js';
import { MilkshakeClient, t } from '../../index.js';
import { logger, installGuild } from '../../components/exports.js';

const event: EventInterface = {
	name: 'guildCreate',
	options: { once: false, rest: false },
	execute: async (guild: Guild, client: MilkshakeClient) => {
		try {
			installGuild(client, guild.id);
			logger.info(`✅ Guild settings ensured for ${guild.name} (${guild.id})`);
		} catch (err) {
			logger.error(`❌ Failed to ensure guild settings for ${guild.name} (${guild.id}): ${err}`);
		}

		const welcomeMessage = [
			await t(guild.id, 'events.newGuild._1', { guild_name: guild.name }),
			' ',
			await t(guild.id, 'events.newGuild._2'),
			await t(guild.id, 'events.newGuild._3'),
			' ',
			await t(guild.id, 'events.newGuild._4'),
			await t(guild.id, 'events.newGuild._5', {
				client_invite: 'https://discord.com/oauth2/authorize?client_id=1374870746006032414',
			}),
			await t(guild.id, 'events.newGuild._6', { client_support_server: 'https://discord.com/invite/wSAkewmzAM' }),
			await t(guild.id, 'events.newGuild._7', { client_kofi_link: 'https://ko-fi.com/duckodas' }),
			' ',
			await t(guild.id, 'events.newGuild._8'),
		].join('\n');

		const channel = guild.channels.cache
			.filter(
				(c) =>
					(c.type === 0 || c.type === 5 || c.type === 10) &&
					c.permissionsFor(guild.members.me!).has(['SendMessages', 'ViewChannel']),
			)
			.first() as TextChannel | undefined;

		if (!channel) {
			logger.warn({
				labels: { event: 'guildCreate' },
				message: `No channel to send welcome in ${guild.name}`,
			});
			return;
		}

		try {
			await channel.send(welcomeMessage);
			logger.info({
				labels: { event: 'guildCreate' },
				message: `Sent welcome message in ${guild.name} (#${channel.id})`,
			});
		} catch (err) {
			logger.error({
				labels: { event: 'guildCreate' },
				message: `Failed to send welcome message in ${guild.name}: ${err}`,
			});
		}
	},
};

export default event;
