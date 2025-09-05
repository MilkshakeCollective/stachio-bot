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
		.setName('guild')
		.setDescription('View or change the bot settings for this server')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) => sub.setName('settings').setDescription('View current guild settings'))
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

			if (subcommand === 'settings') {
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
					.setTitle(
						await t(interaction.guild!.id, 'commands.management.guild.settings.embed.title', {
							guild_name: interaction.guild!.name,
						}),
					)
					.setDescription(
						[
							`${await t(interaction.guild!.id, 'commands.management.guild.settings.embed._1')} \`${guildConfig.language}\``,
							`${await t(interaction.guild!.id, 'commands.management.guild.settings.embed._2')} ${guildConfig.watchdog?.enabled ? '`✅`' : '`❌`'}`,
							`${await t(interaction.guild!.id, 'commands.management.guild.settings.embed._3')} ${guildConfig.AntiPhishing?.enabled ? '`✅`' : '`❌`'}`,
							`${await t(interaction.guild!.id, 'commands.management.guild.settings.embed._4')} ${guildConfig.verification?.enabled ? '`✅`' : '`❌`'}`,
							`${await t(interaction.guild!.id, 'commands.management.guild.settings.embed._5')} ${guildConfig.WarningConfig ? '`✅`' : '`❌`'}`,
						].join('\n'),
					)
					.setColor(client.config.colors.primary)
					.setTimestamp();

				return interaction.editReply({ embeds: [embed] });
			}

			if (subcommand === 'language') {
				const lang = interaction.options.getString('code') ?? 'en-US';

				if (!SUPPORTED_LANGUAGES.includes(lang)) {
					return interaction.editReply({
						content: [
							await t(interaction.guild!.id, 'commands.management.guild.language.unsupportedLanguages._1', {
								language: lang,
							}),
							await t(interaction.guild!.id, 'commands.management.guild.language.unsupportedLanguages._2'),
							`\`${SUPPORTED_LANGUAGES.join(', ')}\``,
						].join('n'),
					});
				}

				await setGuildLanguage(guildId, lang);

				return interaction.editReply({
					content: await t(interaction.guild!.id, 'commands.management.guild.language.success', {
						language: lang,
					}),
				});
			}
		} catch (err) {
			console.error(err);
			if (!interaction.replied) {
				await interaction.editReply({
					content: await t(interaction.guild!.id, 'commands.management.guild.language.error'),
				});
			}
		}
	},
};

export default command;
