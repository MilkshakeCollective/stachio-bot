import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
import { Events, GuildMember } from 'discord.js';
import { logger, actionUser } from '../../components/exports.js';

const event: EventInterface = {
	name: Events.GuildMemberAdd,
	options: { once: false, rest: false },
	execute: async function (member: GuildMember, client: MilkshakeClient) {
		try {
			const flaggedUser = await client.prisma.users.findUnique({
				where: { userId: member.user.id },
			});
			if (!flaggedUser) {
				return logger.info(`[WATCHDOG] ${member.user.tag} (${member.id}) is not flagged`);
			}

			const flaggedSettings = await client.prisma.flaggedSettings.findUnique({
				where: { guildId: member.guild.id },
			});
			if (!flaggedSettings || !flaggedSettings.enabled) return;

			const action =
				flaggedUser.status === 'PERM_FLAGGED'
					? flaggedSettings.actionOnPerm
					: flaggedUser.status === 'AUTO_FLAGGED'
						? flaggedSettings.actionOnAuto
						: flaggedSettings.actionOnFlag;

			await actionUser(member, client, action, flaggedUser, flaggedSettings);
		} catch (err) {
			logger.error(`[WATCHDOG ACTION ERROR]`, err);
		}
	},
};

export default event;
