import { HelperClient } from '../../index.js';
import { Guild, Message, TextChannel, User } from 'discord.js';
import { GuildStatus, WatchdogStatus } from '@prisma/client';

// simple async delay
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// configurable delay (safe ~1 msg/sec)
const MESSAGE_DELAY = 1300;

// how many users/guilds to pull from DB per batch
const BATCH_SIZE = 100;

/**
 * Poll DB for blacklisted guilds not yet notified and send them to the channel
 */
export async function pollNewBlacklistedGuilds(client: HelperClient) {
	const logChannelId = client.config.channels[1].id;
	const channel = client.channels.cache.get(logChannelId) as TextChannel;
	if (!channel) return;

	let hasMore = true;
	let lastId = 0;

	while (hasMore) {
		const blacklistedGuilds = await client.prisma.guilds.findMany({
			where: {
				status: { in: [GuildStatus.BLACKLISTED] },
				logged: false,
				id: { gt: lastId },
			},
			select: {
				id: true,
				guildId: true,
				name: true,
				reason: true,
			},
			orderBy: { id: 'asc' },
			take: BATCH_SIZE,
		});

		if (blacklistedGuilds.length === 0) {
			hasMore = false;
			break;
		}

		for (const guild of blacklistedGuilds) {
			const message = `${guild.id}. ${guild.name ?? 'Unknown'} : ${guild.guildId} (${guild.reason})`;

			try {
				await client.prisma.guilds.update({
					where: { guildId: guild.guildId }, // ✅ bruger unikt guildId
					data: { logged: true },
				});

				await channel.send(message);
			} catch (err) {
				console.error('❌ Failed to send blacklisted guild message:', err);
			}

			await sleep(MESSAGE_DELAY);
		}

		lastId = blacklistedGuilds[blacklistedGuilds.length - 1].id;
	}
}

/**
 * Send a single blacklisted guild notification
 */
export async function newBlacklistedGuild(client: HelperClient, guild: Guild, reason: string) {
	const logChannelId = client.config.channels[1].id;
	const channel = client.channels.cache.get(logChannelId) as TextChannel;
	if (!channel) return;

	const totalBlacklisted = await client.prisma.guilds.count({
		where: { status: { in: [GuildStatus.BLACKLISTED] } },
	});

	const message = `${totalBlacklisted}. ${guild.name} : ${guild.id} (${reason})`;

	try {
		await channel.send(message).then(async (msg) => {
			msg.crosspost();
		});

		await client.prisma.guilds.update({
			where: { guildId: guild.id }, // ✅ bruger unikt guildId
			data: { logged: true },
		});
	} catch (err) {
		console.error('❌ Failed to send single blacklisted guild message:', err);
	}
}

/**
 * Poll DB for blocked users not yet notified and send them to the channel
 */
export async function pollNewBlockedUsers(client: HelperClient) {
	const logChannelId = client.config.channels[0].id;
	const channel = client.channels.cache.get(logChannelId) as TextChannel;
	if (!channel) return;

	let hasMore = true;
	let lastId = 0;

	while (hasMore) {
		const blockedUsers = await client.prisma.users.findMany({
			where: {
				status: { in: [WatchdogStatus.BLOCKED, WatchdogStatus.PERM_BLOCKED, WatchdogStatus.AUTO_BLOCKED] },
				logged: false,
				id: { gt: lastId },
			},
			select: {
				id: true,
				userId: true,
				last_username: true,
				reason: true,
			},
			orderBy: { id: 'asc' },
			take: BATCH_SIZE,
		});

		if (blockedUsers.length === 0) {
			hasMore = false;
			break;
		}

		for (const user of blockedUsers) {
			const message = `${user.id}. @${user.last_username ?? 'Unknown'} : ${user.userId} (${user.reason})`;

			try {
				await client.prisma.users.update({
					where: { userId: user.userId }, // ✅ bruger unikt userId
					data: { logged: true },
				});

				await channel.send(message);
			} catch (err) {
				console.error('❌ Failed to send flagged user message:', err);
			}

			await sleep(MESSAGE_DELAY);
		}

		lastId = blockedUsers[blockedUsers.length - 1].id;
	}
}

/**
 * Send a single blocked user notification
 */
export async function newBlockedUser(client: HelperClient, user: User, reason: string) {
	const logChannelId = client.config.channels[0].id;
	const channel = client.channels.cache.get(logChannelId) as TextChannel;
	if (!channel) return;

	const totalBlocked = await client.prisma.users.count({
		where: { status: { in: [WatchdogStatus.BLOCKED, WatchdogStatus.PERM_BLOCKED, WatchdogStatus.AUTO_BLOCKED] } },
	});

	const message = `${totalBlocked}. ${user.username} : ${user.id} (${reason})`;

	try {
		await channel.send(message).then(async (msg: Message) => {
			msg.crosspost();
		});

		await client.prisma.users.update({
			where: { userId: user.id }, // ✅ bruger unikt userId
			data: { logged: true },
		});
	} catch (err) {
		console.error('❌ Failed to send single blocked user message:', err);
	}
}
