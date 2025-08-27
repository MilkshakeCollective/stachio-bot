import { MilkshakeClient } from '../../index.js';
import { Snowflake } from 'discord.js';

/**
 * Ensure guild data exists in the database.
 * @param guildId The ID of the guild.
 * @param language Optional language code, defaults to "EN".
 */
export async function installGuild(client: MilkshakeClient, guildId: string, language: string = 'EN') {
	try {
		const existing = await client.prisma.guildSettings.findUnique({
			where: { guildId },
		});

		if (existing) {
			// Guild already exists, return it
			return existing;
		}

		// Create new guild settings
		const newGuild = await client.prisma.guildSettings.create({
			data: {
				guildId,
				language,
			},
		});

		return newGuild;
	} catch (err) {
		console.error(`Failed to ensure guild settings for ${guildId}:`, err);
		throw err;
	}
}

/**
 * Delete guild data from the database.
 * @param client The MilkshakeClient instance
 * @param guildId The ID of the guild to delete
 */
export async function uninstallGuild(client: MilkshakeClient, guildId: string) {
	try {
		const existing = await client.prisma.guildSettings.findUnique({
			where: { guildId },
		});

		if (!existing) {
			// Nothing to delete
			return null;
		}

		await client.prisma.guildSettings.delete({
			where: { guildId },
		});

		return true;
	} catch (err) {
		console.error(`Failed to delete guild settings for ${guildId}:`, err);
		throw err;
	}
}

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
