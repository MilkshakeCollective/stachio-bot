import { HelperClient } from '../../index.js';
import { EventInterface } from '../../types.js';
import { logger, pollNewBlockedUsers, pollNewBlacklistedGuilds } from '../../components/exports.js';
import { Events } from 'discord.js';

const event: EventInterface = {
	name: Events.ClientReady,
	options: { once: true, rest: false },
	execute: async (client: HelperClient) => {
		logger.info(`Client Ready.`);

		let pollRunning = false;

		setInterval(async () => {
			if (pollRunning) return;
			pollRunning = true;

			try {
				// Poll blocked users
				await pollNewBlockedUsers(client);

				// Poll blacklisted guilds
				await pollNewBlacklistedGuilds(client);
			} catch (err) {
				console.error('❌ Polling error:', err);
			} finally {
				pollRunning = false;
			}
		}, 30_000);
	},
};

export default event;
