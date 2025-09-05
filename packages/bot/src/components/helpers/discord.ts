import { MilkshakeClient, t } from '../../index.js';
import { GuildMember, Snowflake } from 'discord.js';

/**
 * @param client
 * @param guildId
 * @param userId
 * @param moderatorId
 * @param points
 * @param reason
 * @returns
 */
export async function addWarning(
	client: MilkshakeClient,
	guildId: string,
	userId: string,
	moderatorId: string,
	points: number,
	reason: string,
) {
	await client.prisma.warnings.create({
		data: { guildId, userId, moderator: moderatorId, points, reason },
	});

	let config = await client.prisma.warningConfig.findUnique({ where: { guildId } });
	config ??= await client.prisma.warningConfig.create({
		data: {
			guildId,
			decayDays: 90,
			thresholds: JSON.stringify([
				{ points: 5, action: 'mute', durationMinutes: 30 },
				{ points: 10, action: 'kick' },
				{ points: 15, action: 'ban' },
			]),
		},
	});

	const cutoff = new Date(Date.now() - config.decayDays * 24 * 60 * 60 * 1000);

	const warnings = await client.prisma.warnings.findMany({
		where: { guildId, userId, createdAt: { gte: cutoff } },
	});

	const total = warnings.reduce((sum, w) => sum + w.points, 0);

	return { total, config };
}

/**
 * @param member
 * @param total
 * @param config
 */
export async function enforceSanctions(member: GuildMember, total: number, config: any) {
	if (!config || !config.thresholds) return;

	// Convert thresholds object into array of entries
	for (const [action, pointsValue] of Object.entries(config.thresholds)) {
		const points = Number(pointsValue); // cast to number
		if (total >= points) {
			switch (action) {
				case 'mute':
					await member.timeout(10 * 60 * 1000, await t(member.guild.id, 'helpers.warn.sanctions.mute'));
					break;
				case 'kick':
					await member.kick(await t(member.guild.id, 'helpers.warn.sanctions.kick'));
					break;
				case 'ban':
					await member.ban({ reason: await t(member.guild.id, 'helpers.warn.sanctions.ban') });
					break;
			}
		}
	}
}

/**
 * Ensure guild data exists in the database.
 * @param guildId The ID of the guild.
 * @param language Optional language code, defaults to "EN".
 */
export async function installGuild(client: MilkshakeClient, guildId: string, language: string = 'en-US') {
	try {
		const existing = await client.prisma.guildConfig.findUnique({
			where: { guildId },
		});

		if (existing) {
			// Guild already exists, return it
			return existing;
		}

		// Create new guild settings
		const newGuild = await client.prisma.guildConfig.create({
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
		const existing = await client.prisma.guildConfig.findUnique({
			where: { guildId },
		});

		if (!existing) {
			// Nothing to delete
			return null;
		}

		await client.prisma.guildConfig.delete({
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
