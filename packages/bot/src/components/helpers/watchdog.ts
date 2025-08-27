import { GuildMember, EmbedBuilder, Role, TextChannel } from 'discord.js';
import { MilkshakeClient } from '../../index.js';
import { logger } from '../exports.js';

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
		.setTitle('📊 Weekly Watchdog Report')
		.setColor('Blurple')
		.setDescription(
			[
				'Here\'s a summary of flagged users and appeals for the past week. Stay safe and keep your community clean!',
				'',
				'**`⚠️` Flagged Users**',
				`- Total Flagged: \`${totalFlagged}\``,
				`- Auto-Flagged: \`${totalAutoFlagged}\``,
				`- Permanent Flags: \`${totalPermFlagged}\``,
				'',
				'**`✉️` Appeals**',
				`- Total Appeals: \`${totalAppealed}\``,
				`- Approved: \`✅\` \`${totalApprovedAppeals}\``,
				`- Denied: \`❌\` \`${totalDeniedAppeals}\``,
				`- Pending: \`⏳\` \`${totalPendingAppeals}\``,
			].join('\n'),
		)
		.setFooter({ text: 'Watchdog Weekly Report' })
		.setTimestamp();

	await reportChannel.send({ embeds: [embed] });
	logger.info('[WATCHDOG REPORT] Weekly report sent.');
}

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
			? 'You have automatically been assigned a restricted role.'
			: action === 'BAN'
				? 'You are permanently banned from this server.'
				: action === 'KICK'
					? 'You have been kicked from this server.'
					: 'You have received a warning.';

	// DM embed
	const dmEmbed = new EmbedBuilder()
		.setTitle('⚠️ You Have Been Flagged')
		.setColor('Orange')
		.setDescription(
			[
				`If you are receiving this message, you are flagged in **${member.guild.name}** by the safety system.`,
				'',
				`**Reason:** ${flaggedUser.reason ?? 'No reason provided'}`,
				`**What This Means?** ${actionText}`,
				'',
				`**Next Steps:**`,
				`Join the **Online Safety Discord** to appeal or learn more.`,
				'👉 [Join Online Safety Discord](https://discord.gg/wSAkewmzAM)',
			].join('\n'),
		)
		.setFooter({ text: 'This is an automated system message' })
		.setTimestamp();

	try {
		await member.send({ embeds: [dmEmbed] });
		logger.info(`[WATCHDOG] Sent DM to ${member.user.tag}`);
	} catch {
		logger.warn(`[WATCHDOG] Could not DM ${member.user.tag}`);
	}

	let actionTaken = 'NONE';

	// Selve handlingen
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
				.setTitle('🚨 Flagged User Detected')
				.setColor('Red')
				.setThumbnail(member.user.displayAvatarURL())
				.setDescription(
					[
						`A flagged user has joined **${member.guild.name}**.`,
						'',
						`**User:** ${member.user.tag} (${member.id})`,
						`**Status:** ${flaggedUser.status}`,
						`**Action Taken:** ${actionTaken}`,
						`**Reason:** ${flaggedUser.reason ?? 'No reason provided'}`,
					].join('\n'),
				)
				.setTimestamp();

			await logChannel.send({ embeds: [logEmbed] });
		}
	}

	logger.info(`[WATCHDOG] Action taken on ${member.user.tag}: ${actionTaken}`);
}
