import { GuildMember, EmbedBuilder, Role, TextChannel } from 'discord.js';
import { MilkshakeClient, t } from '../../index.js';
import { logger } from '../exports.js';

/**
 * @param client
 * @returns
 */
export async function sendWatchdogReport(client: MilkshakeClient) {
	const reportChannel = client.channels.cache.get(client.config.channels[0].id) as TextChannel;
	if (!reportChannel) {
		logger.warn('[WATCHDOG REPORT] Report channel not found.');
		return;
	}

	const totalFlagged = await client.prisma.users.count({
		where: { status: 'FLAGGED' },
	});
	const totalAutoFlagged = await client.prisma.users.count({
		where: { status: 'AUTO_FLAGGED' },
	});
	const totalPermFlagged = await client.prisma.users.count({
		where: { status: 'PERM_FLAGGED' },
	});
	const totalAppealed = await client.prisma.appeal.count();
	const totalApprovedAppeals = await client.prisma.appeal.count({
		where: { status: 'APPROVED' },
	});
	const totalDeniedAppeals = await client.prisma.appeal.count({
		where: { status: 'DENIED' },
	});
	const totalPendingAppeals = await client.prisma.appeal.count({
		where: { status: 'PENDING' },
	});

	const embed = new EmbedBuilder()
		.setTitle(await t(reportChannel.guildId, 'helpers.watchdog.weekly_report.title'))
		.setColor(client.config.colors.primary)
		.setDescription(
			[
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._1'),
				'',
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._2'),
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._3', { total_flagged: totalFlagged }),
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._4', { total_auto_flagged: totalAutoFlagged }),
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._5', { total_perm_flagged: totalPermFlagged }),
				'',
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._6'),
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._7', { total_appealed: totalAppealed }),
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._8', {
					total_approved_appeals: totalApprovedAppeals,
				}),
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._9', {
					total_denied_appeals: totalDeniedAppeals,
				}),
				await t(reportChannel.guildId, 'helpers.watchdog.weekly_report._10', {
					total_pending_appeals: totalPendingAppeals,
				}),
			].join('\n'),
		)
		.setFooter({ text: await t(reportChannel.guildId, 'helpers.watchdog.weekly_report.footer') })
		.setTimestamp();

	await reportChannel.send({ embeds: [embed] });
	logger.info('[WATCHDOG REPORT] Weekly report sent.');
}

/**
 * @param member
 * @param client
 * @param action
 * @param flaggedUser
 * @param flaggedSettings
 * @returns
 */
export async function actionUser(
	member: GuildMember,
	client: MilkshakeClient,
	action: string,
	flaggedUser: any,
	flaggedSettings: any,
): Promise<void> {
	const latestAppeal = await client.prisma.appeal.findFirst({
		where: { userId: flaggedUser.userId },
		orderBy: { createdAt: 'desc' },
	});
	if (latestAppeal?.status === 'APPROVED') {
		logger.info(`[WATCHDOG] ${member.user.username} has an approved appeal. Ignoring flag.`);
		return;
	}

	const actionText =
		action === 'ROLE'
			? await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._2')
			: action === 'BAN'
				? await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._3')
				: action === 'KICK'
					? await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._4')
					: await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._5');

	const dmEmbed = new EmbedBuilder()
		.setTitle(await t(member.guild.id, 'helpers.watchdog.action.dmEmbed.title'))
		.setColor(client.config.colors.warning)
		.setDescription(
			[
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._1', { member_guild_name: member.guild.name }),
				'',
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._2._1'),
				+`${flaggedUser.reason ?? (await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._2._2'))}`,
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._3._1', { action_taken: actionText }),
				'',
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._4'),
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._5'),
				await t(member.guild.id, 'helpers.watchdog.action.dmEmbed._6', {
					client_support_server: 'https://discord.gg/wSAkewmzAM',
				}),
			].join('\n'),
		)
		.setFooter({ text: await t(member.guild.id, 'helpers.watchdog.action.dmEmbed.footer') })
		.setTimestamp();

	try {
		await member.send({ embeds: [dmEmbed] });
		logger.info(`[WATCHDOG] Sent DM to ${member.user.tag}`);
	} catch {
		logger.warn(`[WATCHDOG] Could not DM ${member.user.tag}`);
	}

	let actionTaken = 'NONE';

	switch (action) {
		case 'BAN':
			await member.ban({ reason: flaggedUser.reason ?? `Flagged by ${client.user?.username}` });
			actionTaken = 'BANNED';
			break;

		case 'KICK':
			await member.kick(flaggedUser.reason ?? `Flagged by ${client.user?.username}`);
			actionTaken = 'KICKED';
			break;

		case 'ROLE':
			if (flaggedSettings.roleId) {
				const role: Role | undefined = member.guild.roles.cache.get(flaggedSettings.roleId);
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

	if (flaggedSettings.logChannelId) {
		const logChannel = member.guild.channels.cache.get(flaggedSettings.logChannelId) as TextChannel;
		if (logChannel) {
			const logEmbed = new EmbedBuilder()
				.setTitle(await t(member.guild.id, 'helpers.watchdog.action.logEmbed.title'))
				.setColor(client.config.colors.error)
				.setThumbnail(member.user.displayAvatarURL())
				.setDescription(
					[
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._1', { member_guild_name: member.guild.name }),
						'',
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._2', { member_user_tag: member.user, member_id: member.user.id }),
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._3', { flaggedUser_status: flaggedUser.status }),
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._4', { action_taken: actionTaken }),
						await t(member.guild.id, 'helpers.watchdog.action.logEmbed._5', { flaggedUser_reason: flaggedUser.reason }),
					].join('\n'),
				)
				.setTimestamp();

			await logChannel.send({ embeds: [logEmbed] });
		}
	}

	logger.info(`[WATCHDOG] Action taken on ${member.user.tag}: ${actionTaken}`);
}
