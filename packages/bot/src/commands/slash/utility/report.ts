import { MilkshakeClient } from '../../../index.js';
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
			option.setName('screenshot1').setDescription('Upload a screenshot (optional)').setRequired(false),
		)
		.addAttachmentOption((option) =>
			option.setName('screenshot2').setDescription('Upload another screenshot (optional)').setRequired(false),
		)
		.addAttachmentOption((option) =>
			option.setName('screenshot3').setDescription('Upload a third screenshot (optional)').setRequired(false),
		)
		.addAttachmentOption((option) =>
			option.setName('screenshot4').setDescription('Upload a fourth screenshot (optional)').setRequired(false),
		)
		.addAttachmentOption((option) =>
			option.setName('screenshot5').setDescription('Upload a fifth screenshot (optional)').setRequired(false),
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
				.setTitle('🚨 New User Report')
				.setColor(client.config.colors.error)
				.setDescription(
					[
						`**Reporter:**\n${reporter.tag} (${reporter.id})`,
						`**Reported User:**\n${reported.tag} (${reported.id})`,
						`**Reason:**\n${description}`,
						`**Evidence:**\n${evidence || 'No extra details provided'}`,
						`**Screenshots:**\n${
							screenshots.length
								? screenshots.map((s, i) => `[Screenshot ${i + 1}](${s})`).join('\n')
								: 'No screenshots provided'
						}`,
					].join('\n'),
				)
				.setTimestamp();

			const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`report_preview_${report.id}`)
					.setLabel('Under Review')
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId(`report_resolved_${report.id}`)
					.setLabel('Resolve')
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder().setCustomId(`report_rejected_${report.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger),
			);

			const staffChannel = (await client.channels.fetch(client.config.channels[2].id)) as TextChannel;
			await staffChannel.send({ embeds: [embed], components: [buttons] });

			return interaction.editReply({
				content: `✅ Your report against **${reported.tag}** has been submitted with **${screenshots.length}** screenshot(s). Staff will review it soon.`,
			});
		} catch (err) {
			console.error(err);
			return interaction.editReply({
				content: '❌ Something went wrong while submitting your report. Please try again later.',
			});
		}
	},
};

export default command;
