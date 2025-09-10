import { GuildMember, EmbedBuilder, Role, TextChannel } from 'discord.js';
import { MilkshakeClient, t } from '../../index.js';
import { logger } from '../exports.js';

/**
 * @param member
 * @param client
 * @param action
 * @param blockedUser
 * @param watchdogConfig
 * @returns
 */
export async function actionUser(
	member: GuildMember,
	client: MilkshakeClient,
	action: string,
	blockedUser: any,
	watchdogConfig: any,
): Promise<void> {
	// Check if user has approved appeal
	const isUserApproved = await client.prisma.users.findUnique({
		where: { userId: blockedUser.userId },
	});
	if (isUserApproved?.status === 'APPEALED') {
		logger.info(`[WATCHDOG] ${member.user.username} has an approved appeal. Ignoring flag.`);
		return;
	}

	// Determine action text
	const actionText =
		action === 'ROLE'
			? await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._2')
			: action === 'BAN'
				? await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._3')
				: action === 'KICK'
					? await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._4')
					: await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._5');

	// Main DM Embed
	const dmEmbed = new EmbedBuilder()
		.setTitle(await t(member.guild.id, 'helpers.watchdog.action.dmEmbed.title'))
		.setColor(client.config.colors.warning)
		.setDescription(
			[
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._1', { member_guild_name: member.guild.name }),
				'',
				(await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._2._1')) +
					' ' +
					`${blockedUser.reason ?? (await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._2._2'))}`,
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._1', { action_taken: actionText }),
				'',
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._4'),
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._5'),
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._6', {
					client_support_server: 'https://stachio.dk/discord',
				}),
			].join('\n'),
		)
		.setFooter({ text: await t(member.guild.id, 'helpers.watchdog.action.dmEmbed.footer') })
		.setTimestamp();

	// Safe handling of foundAt
	let foundAtEmbed: EmbedBuilder | undefined;
	const foundAtArray = Array.isArray(blockedUser.foundAt) ? blockedUser.foundAt : [];

	if (foundAtArray.length > 0) {
		const formattedFoundAtLines = foundAtArray
			.map((entry: any) => {
				const icon = entry.type === 'owner' ? '👑' : entry.type === 'staff' ? '🛡️' : '👤';
				const typeName = entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
				const rolesText = entry.roles && entry.roles.length > 0 ? `\n> **Roles:** ${entry.roles.join(', ')}` : '';
				return `> ${icon} **${typeName}** at **${entry.guildName}** (\`${entry.guildId}\`)` + rolesText;
			})
			.join('\n');

		foundAtEmbed = new EmbedBuilder()
			.setTitle(await t(member.guild.id, 'helpers.watchdog.action.dmEmbed.foundAtTitle'))
			.setDescription(formattedFoundAtLines)
			.setColor(client.config.colors.warning)
			.setFooter({ text: await t(member.guild.id, 'helpers.watchdog.action.dmEmbed.footer') })
			.setTimestamp();
	}

	// Send DM
	try {
		if (foundAtEmbed) {
			await member.send({ embeds: [dmEmbed, foundAtEmbed] });
		} else {
			await member.send({ embeds: [dmEmbed] });
		}
		logger.info(`[WATCHDOG] Sent DM to ${member.user.tag}`);
	} catch {
		logger.warn(`[WATCHDOG] Could not DM ${member.user.tag}`);
	}

	// Apply action
	let actionTaken = 'NONE';
	switch (action) {
		case 'BAN':
			await member.ban({ reason: blockedUser.reason ?? `Blocked by ${client.user?.username}` });
			actionTaken = 'BANNED';
			break;

		case 'KICK':
			await member.kick(blockedUser.reason ?? `Blocked by ${client.user?.username}`);
			actionTaken = 'KICKED';
			break;

		case 'ROLE':
			if (watchdogConfig.roleId) {
				const role: Role | undefined = member.guild.roles.cache.get(watchdogConfig.roleId);
				if (role) {
					await member.roles.add(role).catch((err) => logger.warn(`[WATCHDOG] Could not assign role: ${err.message}`));
					actionTaken = `ROLE_ADDED (${role.name})`;
				} else {
					actionTaken = 'ROLE_NOT_FOUND';
				}
			} else {
				actionTaken = 'ROLE_NOT_CONFIGURED';
			}
			break;

		case 'WARN':
			actionTaken = 'WARNED (DM sent)';
			break;

		default:
			logger.warn(`[WATCHDOG] Unknown action: ${action}`);
			actionTaken = `UNKNOWN ACTION: ${action}`;
	}

	// Log to channel
	if (watchdogConfig.logChannelId) {
		const logChannel = member.guild.channels.cache.get(watchdogConfig.logChannelId) as TextChannel;
		if (logChannel) {
			const logEmbed = new EmbedBuilder()
				.setTitle(await t(member.guild.id, 'helpers.watchdog.action.logEmbed.title'))
				.setColor(client.config.colors.error)
				.setThumbnail(member.user.displayAvatarURL())
				.setDescription(
					[
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._1', { member_guild_name: member.guild.name }),
						'',
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._2', {
							member_user_name: member.user.username,
							member_id: member.user.id,
						}),
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._3', { blockedUser_status: blockedUser.status }),
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._4', { action_taken: actionTaken }),
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._5', { blockedUser_reason: blockedUser.reason }),
					].join('\n'),
				)
				.setTimestamp();

			await logChannel.send({ embeds: [logEmbed] });
		}
	}

	logger.info(`[WATCHDOG] Action taken on ${member.user.tag}: ${actionTaken}`);
}
