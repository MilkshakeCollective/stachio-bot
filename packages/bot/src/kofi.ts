import express from 'express';
import bodyParser from 'body-parser';
import { MilkshakeClient } from './index.js';
import { TextChannel } from 'discord.js';
import { logger } from './components/exports.js';

export function startKoFiWebhookServer(client: MilkshakeClient) {
	const app = express();
	app.use(bodyParser.urlencoded({ extended: true }));

	// --- Helper: Extract Discord ID from Ko-fi message ---
	function extractDiscordId(message: string): string | null {
		const match = message.match(/\b\d{15,19}\b/);
		return match ? match[0] : null;
	}

	// --- Helper: Determine reward roles ---
	function getRewardRoleIds(data: any): string[] {
		const roles: string[] = [];

		if (data.type === 'Donation' && data.amount) {
			const amount = parseFloat(data.amount);

			// Always supporter for >= 1
			if (amount >= 1) roles.push(process.env.ROLE_SUPPORTER_ID!);

			// VIP bonus for >= 15
			if (amount >= 15) roles.push(process.env.ROLE_VIP_ID!);
		}

		return roles;
	}

	// --- Webhook Endpoint ---
	app.post('/kofi-webhook', async (req, res) => {
		try {
			const rawData = req.body.data;
			if (!rawData) {
				logger.warn('Webhook received without data payload');
				return res.sendStatus(400);
			}

			const data = JSON.parse(rawData);

			// Verify token
			if (data.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
				logger.warn('Invalid Ko-fi verification token');
				return res.sendStatus(403);
			}

			// Ignore private donations
			if (!data.is_public) return res.sendStatus(200);

			// Extract Discord ID
			const discordId = extractDiscordId(data.message || '');
			if (!discordId) {
				logger.info('No Discord ID found in Ko-fi message');
				return res.sendStatus(200);
			}

			// Fetch user
			const user = await client.users.fetch(discordId).catch(() => null);
			if (!user) {
				logger.error(`User with Discord ID ${discordId} could not be fetched`);
				return res.sendStatus(200);
			}

			// Fetch guild + member
			const guild = await client.guilds.fetch(client.config.guilds[0].id).catch(() => null);
			if (!guild) {
				logger.error('Configured guild not found');
				return res.sendStatus(500);
			}

			const member = await guild.members.fetch(user.id).catch(() => null);
			if (!member) {
				logger.error(`Member with ID ${user.id} not found in guild`);
				return res.sendStatus(200);
			}

			// Determine reward roles
			const rewardRoleIds = getRewardRoleIds(data);

			if (rewardRoleIds.length === 0) {
				logger.info(
					`Donation of ${data.amount} ${data.currency} from ${data.from_name} did not qualify for a reward role`,
				);
			} else {
				for (const roleId of rewardRoleIds) {
					if (!member.roles.cache.has(roleId)) {
						await member.roles.add(roleId);
						logger.info(`Assigned role ${roleId} to supporter ${member.user.tag} (${data.from_name})`);
					}
				}
			}

			// Thank you message
			const thanksChannel = guild.channels.cache.get(process.env.CHANNEL_SUPPORTERS_ID!) as TextChannel;

			if (thanksChannel) {
				await thanksChannel.send(
					[
						`🎉 Thank you **${data.from_name}** <@${user.id}>!`,
						`Your ${data.type.toLowerCase()} of **${data.amount} ${data.currency}** helps keep the **Stachio** project alive ❤️`,
					].join('\n'),
				);
			}

			return res.sendStatus(200);
		} catch (err) {
			logger.error('Error processing Ko-fi webhook:', err);
			return res.sendStatus(500);
		}
	});

	// --- Start Server ---
	const port = process.env.PORT || 3000;
	app.listen(port, () => {
		logger.info(`✅ Ko-fi webhook server running on port ${port}`);
	});
}
