import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import i18next from 'i18next';
import FsBackend from 'i18next-fs-backend';
import type { FsBackendOptions } from 'i18next-fs-backend';
import { PrismaClient } from '@prisma/client';
import { Guild } from 'discord.js';
import { logger } from '../components/exports.js';
import { defaultLanguage } from '../config/config.js';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

// ------------------------------
// Initialize i18next
// ------------------------------
await i18next.use(FsBackend).init<FsBackendOptions>({
	fallbackLng: defaultLanguage,
	lng: defaultLanguage,
	ns: ['translation'],
	defaultNS: 'translation',
	backend: {
		loadPath: path.resolve(__dirname, '..', '..', '..', '..', 'locales', '{{lng}}', '{{ns}}.json'),
	},
	interpolation: { escapeValue: false },
	returnNull: false,
});

// ------------------------------
// Guild Language Cache
// ------------------------------
const guildLanguageCache: Map<string, string> = new Map();

// ------------------------------
// Helper: get translator bound to a guild
// ------------------------------
export async function getGuildT(guildId: string) {
	let lang = guildLanguageCache.get(guildId);
	if (!lang) {
		const cfg = await prisma.guildConfig.findUnique({ where: { guildId } });
		lang = cfg?.language ?? defaultLanguage;
		guildLanguageCache.set(guildId, lang);
	}
	// getFixedT(lang) returns a function you can call directly: t('welcome', { server })
	return i18next.getFixedT(lang);
}

// ------------------------------
// Get guild language directly
// ------------------------------
export async function getGuildLanguage(guild: Guild) {
	try {
		const cfg = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
		const lang = cfg?.language ?? defaultLanguage;
		guildLanguageCache.set(guild.id, lang);
		return lang;
	} catch (error) {
		logger.error(`Failed to fetch guild settings for guild ${guild.name}:`, error);
		return defaultLanguage;
	}
}

// ------------------------------
// Set / change guild language
// ------------------------------
export async function setGuildLanguage(guildId: string, lng: string) {
	// Optional: validate language code pattern
	if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(lng)) {
		throw new Error('INVALID_LANGUAGE_CODE');
	}

	await prisma.guildConfig.upsert({
		where: { guildId },
		create: { guildId, language: lng },
		update: { language: lng },
	});

	guildLanguageCache.set(guildId, lng);
	await i18next.changeLanguage(lng);
}

// ------------------------------
// Bulk load guild languages (for bot startup or multiple guilds)
// ------------------------------
export async function loadLanguagesForGuilds(guilds: Guild[]) {
	const guildIds = guilds.map((g) => g.id);

	try {
		const existingConfigs = await prisma.guildConfig.findMany({
			where: { guildId: { in: guildIds } },
		});

		// Load existing guild languages into cache
		for (const cfg of existingConfigs) {
			const lang = cfg.language ?? defaultLanguage;
			guildLanguageCache.set(cfg.guildId, lang);
		}

		// Create missing guilds in DB
		const existingGuildIds = existingConfigs.map((cfg) => cfg.guildId);
		const missingGuildIds = guildIds.filter((id) => !existingGuildIds.includes(id));

		for (const guildId of missingGuildIds) {
			await prisma.guildConfig.create({
				data: {
					guildId,
					language: defaultLanguage,
				},
			});
			guildLanguageCache.set(guildId, defaultLanguage);
		}
	} catch (error) {
		logger.error('Failed to bulk load guild languages:', error);
	}
}

// ------------------------------
// Helper: translate a key for a guild with optional variables
// ------------------------------
export async function t(guildId: string, key: string, vars?: Record<string, any>) {
	const translator = await getGuildT(guildId);
	return translator(key, vars); // no "translation:" prefix required because defaultNS is 'translation'
}

// ------------------------------
// Optional: change default bot language
// ------------------------------
export async function changeLanguage(lng: string) {
	await i18next.changeLanguage(lng);
}

export default i18next;
