import { MilkshakeClient, t, setGuildLanguage } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const SUPPORTED_LANGUAGES = [
	'ar-EG',
	'bg',
	'cs',
	'da',
	'de',
	'el',
	'en-GB',
	'en-US',
	'es-ES',
	'fi',
	'fr',
	'hi',
	'hr',
	'hu',
	'id',
	'it',
	'ja',
	'ko',
	'lt',
	'nl',
	'no',
	'pl',
	'pt-BR',
	'ro',
	'ru',
	'sv-SE',
	'th',
	'tr-TR',
	'uk',
	'vi',
	'zh-CN',
	'zh-TW',
];

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription('View or change the bot settings for this server')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) => sub.setName('view').setDescription('View current guild settings'))
		.addSubcommand((sub) =>
			sub
				.setName('language')
				.setDescription('Change the bot language for this guild')
				.addStringOption((opt) =>
					opt.setName('code').setDescription('Language code (e.g. en-US, da, de)').setRequired(true),
				),
		),

	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		try {
			const guildId = interaction.guildId!;
			const subcommand = interaction.options.getSubcommand();

			if (subcommand === 'view') {
				const guildConfig = await client.prisma.guildConfig.upsert({
					where: { guildId },
					update: {},
					create: { guildId },
					include: {
						watchdog: true,
						AntiPhishing: true,
						verification: true,
						WarningConfig: true,
					},
				});

				const embed = new EmbedBuilder()
					.setTitle(`⚙️ Guild Settings for ${interaction.guild!.name}`)
					.setDescription(
						[
							`**Language:** \`${guildConfig.language}\``,
							`**Watchdog:** ${guildConfig.watchdog?.enabled ? '`✅`' : '`❌`'}`,
							`**Anti-Phishing:** ${guildConfig.AntiPhishing?.enabled ? '`✅`' : '`❌`'}`,
							`**Verification:** ${guildConfig.verification?.enabled ? '`✅`' : '`❌`'}`,
							`**Warnings:** ${guildConfig.WarningConfig ? '`✅`' : '`❌`'}`,
						].join('\n'),
					)
					.setColor(client.config.colors.primary)
					.setTimestamp();

				return interaction.editReply({ embeds: [embed] });
			}

			if (subcommand === 'language') {
				const lang = interaction.options.getString('code') ?? "en-US";

				if (!SUPPORTED_LANGUAGES.includes(lang)) {
					return interaction.editReply({
						content: `\`❌\` The language **${lang}** is not supported.\n\n\`✅\` Supported languages are:\n\`${SUPPORTED_LANGUAGES.join(', ')}\``,
					});
				}

				await setGuildLanguage(guildId, lang);

				return interaction.editReply({
					content: `\`🌍\` Language for this guild has been set to **${lang}**`,
				});
			}
		} catch (err) {
			console.error(err);
			if (!interaction.replied) {
				await interaction.editReply({ content: '⚠️ An error occurred while processing this command.' });
			}
		}
	},
};

export default command;
