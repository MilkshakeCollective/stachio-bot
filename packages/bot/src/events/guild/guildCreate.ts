import { Guild, TextChannel } from 'discord.js';
import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
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
			`👋 Hey **${guild.name}**!`,
			'',
			`Thanks for inviting **Online Safety Bot** 🚨`,
			'We\'ll help keep your community safe and positive ✅',
			'',
			'🔗 **Quick Links**',
			'• [Invite the Bot](<https://discord.com/oauth2/authorize?client_id=1374870746006032414>)',
			'• [Support Server](https://discord.com/invite/wSAkewmzAM)',
			'• [Support Us](<https://ko-fi.com/duckodas>)',
			'',
			'💡 Need help? Join our support server anytime!',
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
