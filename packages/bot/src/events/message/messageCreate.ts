import { Events, Message, GuildMember } from 'discord.js';
import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
import { logger } from '../../components/exports.js';

const keywordPatterns: RegExp[] = [
	/\bfree.?nitro\b/i,
	/\bdiscord.*gift\b/i,
	/\bsteam.*free\b/i,
	/\bnitro.*(gift|free)\b/i,
	/\bgratis.?nitro\b/i,
	/\blogin.*discord\b/i,
	/@everyone.*free/i,
	/\b(disc[o0]rd|dlscord|díscord|d1scord)\b/i,
];

// Whitelisted safe domains
const allowedDomains = [
	'discord.com',
	'discordapp.com',
	'discord.gg',
	'steamcommunity.com',
	'store.steampowered.com',
	'github.com',
	'youtube.com',
	'youtu.be',
];

// Regex for detecting *any* links
const urlRegex = /(https?:\/\/[^\s]+)/gi;

function isAllowedDomain(domain: string): boolean {
	const normalized = domain.replace(/^www\./, '').toLowerCase();
	return allowedDomains.some((allowed) => {
		const allowedNorm = allowed.toLowerCase();
		return normalized === allowedNorm || normalized.endsWith(`.${allowedNorm}`);
	});
}

function isSuspicious(content: string): boolean {
	// Extract all URLs from the message
	const urls = content.match(urlRegex) || [];
	const textOnly = content.replace(urlRegex, ''); // remove URLs for keyword check

	// First check URLs against whitelist
	for (const url of urls) {
		try {
			const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
			if (!isAllowedDomain(domain)) {
				logger.debug(`[AntiPhish] Unallowed domain detected: ${domain} (from ${url})`);
				return true;
			} else {
				logger.debug(`[AntiPhish] Allowed domain: ${domain}`);
			}
		} catch {
			logger.debug(`[AntiPhish] Invalid URL detected: ${url}`);
			return true;
		}
	}

	// Now check keywords only in text outside URLs
	if (keywordPatterns.some((r) => r.test(textOnly))) {
		logger.debug(`[AntiPhish] Keyword match in content: "${textOnly}"`);
		return true;
	}

	return false;
}

async function shouldIgnore(client: MilkshakeClient, message: Message): Promise<boolean> {
	if (!message.guild) return true;

	const settings = await client.prisma.antiPhishSettings.findUnique({
		where: { guildId: message.guild.id },
	});

	if (!settings || !settings.enabled) return true;

	// Safely cast JSON fields into string arrays
	const ignoredRoles = Array.isArray(settings.ignoredRoles) ? settings.ignoredRoles : [];
	const ignoredUsers = Array.isArray(settings.ignoredUsers) ? settings.ignoredUsers : [];
	const ignoredChannels = Array.isArray(settings.ignoredChannels) ? settings.ignoredChannels : [];

	// Ignore specific users
	if (ignoredUsers.includes(message.author.id)) return true;

	// Ignore specific channels
	if (ignoredChannels.includes(message.channel.id)) return true;

	// Ignore roles
	const member = message.member as GuildMember;
	if (member && member.roles.cache.some((r) => ignoredRoles.includes(r.id))) return true;

	return false;
}

const event: EventInterface = {
	name: Events.MessageCreate,
	options: { once: false, rest: false },
	execute: async (message: Message, client: MilkshakeClient) => {
		if (!message.content || message.author.bot) return;

		if (await shouldIgnore(client, message)) return;

		const content = message.content;

		if (isSuspicious(content)) {
			try {
				await message.delete();

				const urls = content.match(urlRegex) || [];
				const textOnly = content.replace(urlRegex, '');

				const badUrl = urls.find((url) => {
					try {
						const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
						return !isAllowedDomain(domain);
					} catch {
						return true;
					}
				});

				const matchedPattern = keywordPatterns.find((r) => r.test(textOnly));
				let reason = 'Unknown reason';

				if (badUrl) {
					reason = `Unallowed URL detected: ${badUrl}`;
				} else if (matchedPattern) {
					const matchedKeyword = matchedPattern.exec(textOnly)?.[0] ?? '';
					reason = `Suspicious keyword found: "${matchedKeyword}"`;
				}

				logger.warn(`🚨 Deleted suspicious message from ${message.author.tag}: ${content} | Reason: ${reason}`);

				// Log in database
				await client.prisma.users.upsert({
					where: { userId: message.author.id },
					update: {
						last_username: message.author.username,
						last_avatar: message.author.displayAvatarURL(),
						status: 'AUTO_FLAGGED',
						reason,
						evidence: { message: content, channelId: message.channel.id },
					},
					create: {
						userId: message.author.id,
						last_username: message.author.username,
						last_avatar: message.author.displayAvatarURL(),
						status: 'AUTO_FLAGGED',
						reason,
						evidence: { message: content, channelId: message.channel.id },
					},
				});
			} catch (err) {
				logger.error('Failed to delete suspicious message:', err);
			}
		}
	},
};

export default event;
