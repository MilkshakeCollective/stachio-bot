import { MilkshakeClient } from '../../index.js';
import { Snowflake } from 'discord.js';

export function hasRoles(
	client: MilkshakeClient,
	guildId: Snowflake,
	userId: Snowflake,
	roles: Snowflake | Snowflake[],
) {
	const guild = client.guilds.cache.get(guildId);
	if (guild && userId) {
		const member = guild.members.cache.get(userId);
		if (member) {
			if (Array.isArray(roles)) {
				return roles.some((roleId) => member.roles.cache.has(roleId));
			} else {
				return member.roles.cache.has(roles);
			}
		}
	}
	return false;
}
