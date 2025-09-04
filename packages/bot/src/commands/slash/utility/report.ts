import { MilkshakeClient, t } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	TextChannel,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 60,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('report')
		.setDescription('Report a user to the staff team.')
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
		.addUserOption((option) => option.setName('user').setDescription('The user you want to report').setRequired(true))
		.addStringOption((option) =>
			option.setName('description').setDescription('Why are you reporting this user?').setRequired(true),
		)
		.addStringOption((option) =>
			option.setName('evidence').setDescription('Extra details (message links, IDs, etc.)').setRequired(false),
		)
		.addAttachmentOption((option) =>
			option.setName('screenshot1').setDescription('(FULLSCREEN) Upload a screenshot (optional)').setRequired(false),
		)
		.addAttachmentOption((option) =>
			option.setName('screenshot2').setDescription('(FULLSCREEN) Upload another screenshot (optional)').setRequired(false),
		)
		.addAttachmentOption((option) =>
			option.setName('screenshot3').setDescription('(FULLSCREEN) Upload a third screenshot (optional)').setRequired(false),
		)
		.addAttachmentOption((option) =>
			option.setName('screenshot4').setDescription('(FULLSCREEN) Upload a fourth screenshot (optional)').setRequired(false),
		)
		.addAttachmentOption((option) =>
			option.setName('screenshot5').setDescription('(FULLSCREEN) Upload a fifth screenshot (optional)').setRequired(false),
		),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const guildId = interaction.guildId!;
		const reporter = interaction.user;
		const reported = interaction.options.getUser('user', true);
		const description = interaction.options.getString('description', true);
		const evidence = interaction.options.getString('evidence') || '';

		const screenshots: string[] = [];
		for (let i = 1; i <= 5; i++) {
			const shot = interaction.options.getAttachment(`screenshot${i}`);
			if (shot) screenshots.push(shot.url);
		}

		try {
			const report = await client.prisma.report.create({
				data: {
					guildId,
					reporterId: reporter.id,
					reportedId: reported.id,
					description,
					evidence: evidence ? { details: evidence } : {},
					screenshots,
				},
			});

			// Build staff embed
			const embed = new EmbedBuilder()
				.setTitle(await t(interaction.guild!.id, 'commands.utility.report.embed.title'))
				.setColor(client.config.colors.error)
				.setDescription(
					[
						`${await t(interaction.guild!.id, 'commands.utility.report.embed._1')}\n${reporter.tag} (${reporter.id})`,
						`${await t(interaction.guild!.id, 'commands.utility.report.embed._2')}\n${reported.tag} (${reported.id})`,
						`${await t(interaction.guild!.id, 'commands.utility.report.embed._3')}\n${description}`,
						`${await t(interaction.guild!.id, 'commands.utility.report.embed._4')}\n${evidence || await t(interaction.guild!.id, 'commands.utility.report.embed._5')}`,
						`${await t(interaction.guild!.id, 'commands.utility.report.embed.__6')}\n${
							screenshots.length
								? screenshots
										.map(
											async (s, i) =>
												`[${await t(interaction.guild!.id, 'commands.utility.report.embed._7')} ${i + 1}](${s})`,
										)
										.join('\n')
								: await t(interaction.guild!.id, 'commands.utility.report.embed._8')
						}`,
					].join('\n'),
				)
				.setTimestamp();

			const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`report_preview_${report.id}`)
					.setLabel(await t(interaction.guild!.id, 'commands.utility.report.embed.button_1'))
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId(`report_resolved_${report.id}`)
					.setLabel(await t(interaction.guild!.id, 'commands.utility.report.embed.button_2'))
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId(`report_rejected_${report.id}`)
					.setLabel(await t(interaction.guild!.id, 'commands.utility.report.embed.button_3'))
					.setStyle(ButtonStyle.Danger),
			);

			const staffChannel = (await client.channels.fetch(client.config.channels[2].id)) as TextChannel;
			await staffChannel.send({ embeds: [embed], components: [buttons] });

			return interaction.editReply({
				content: await t(interaction.guild!.id, 'commands.utility.report.reply.success', {
					reported_username: reported.username,
					screenshots_length: screenshots.length,
				}),
			});
		} catch (err) {
			console.error(err);
			return interaction.editReply({
				content: await t(interaction.guild!.id, 'commands.utility.report.reply.error.'),
			});
		}
	},
};

export default command;
