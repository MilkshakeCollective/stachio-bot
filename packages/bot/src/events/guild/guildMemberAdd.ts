import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
import { Events, GuildMember } from 'discord.js';
import { logger, actionUser } from '../../components/exports.js';

const event: EventInterface = {
	name: Events.GuildMemberAdd,
	options: { once: false, rest: false },
	execute: async function (member: GuildMember, client: MilkshakeClient) {
		try {
			const blockedUser = await client.prisma.users.findUnique({
				where: { userId: member.user.id },
			});
			if (!blockedUser) {
				return logger.info({
					labels: { event: 'guildMemberAdd' },
					message: `[WATCHDOG] ${member.user.tag} (${member.id}) is not flagged`,
				});
			}

			const watchdogConfig = await client.prisma.watchdogConfig.findUnique({
				where: { guildId: member.guild.id },
			});
			if (!watchdogConfig || !watchdogConfig.enabled) return;

			const action =
				blockedUser.status === "PERM_BLOCKED"
					? watchdogConfig.actionOnPermBlocked
					: blockedUser.status === 'AUTO_BLOCKED'
						? watchdogConfig.actionOnAutoBlocked
						: watchdogConfig.actionOnBlocked;

			await actionUser(member, client, action, blockedUser, watchdogConfig);
		} catch (err) {
			logger.error({ labels: { event: 'guildMemberAdd' }, message: `[WATCHDOG ACTION ERROR]`, err });
		}
	},
};

export default event;
