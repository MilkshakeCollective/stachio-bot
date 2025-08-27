import { Guild } from 'discord.js';
import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
import { logger, uninstallGuild } from '../../components/exports.js';

const event: EventInterface = {
	name: 'guildDelete',
	options: { once: false, rest: false },
	execute: async (guild: Guild, client: MilkshakeClient) => {
		try {
			await uninstallGuild(client, guild.id);
			logger.info(`🗑️ Guild settings deleted for ${guild.name} (${guild.id})`);
		} catch (err) {
			logger.error(`❌ Failed to delete guild settings for ${guild.name} (${guild.id}): ${err}`);
		}
	},
};

export default event;
