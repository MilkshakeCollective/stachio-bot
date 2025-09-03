import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
import {
	ActionRowBuilder,
	ButtonInteraction,
	Events,
	ModalBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
	EmbedBuilder,
} from 'discord.js';
import { ReportStatus, WatchdogStatus } from '@prisma/client';

async function sendReportLog(client: MilkshakeClient, ReportLogChannel, reportId: any, status: string) {
	const embed = new EmbedBuilder()
		.setColor(status === 'Resolved' ? 'Green' : status === 'Rejected' ? 'Red' : 'Yellow')
		.setTitle('📄 Report Update')
		.setDescription([`**Report ID:** ${reportId}`, `**Status:** ${status}`].join('\n'))
		.setFooter({ text: `${client.user?.username} • ${new Date().toLocaleString()}` });

	await ReportLogChannel.send({ embeds: [embed] });
}

const event: EventInterface = {
	name: Events.InteractionCreate,
	options: { once: false, rest: false },
	execute: async function (interaction: ButtonInteraction, client: MilkshakeClient) {
		if (interaction.isButton()) {
			if (interaction.customId.startsWith('report_')) {
				await interaction.deferReply({ flags: ['Ephemeral'] });

				const [_, action, id] = interaction.customId.split('_');
				const reportId = parseInt(id, 10);

				const report = await client.prisma.report.findUnique({ where: { id: reportId } });
				if (!report) {
					return interaction.editReply({ content: `\`⚠️\` Report #${reportId} not found.` });
				}
				const ReportLogChannel = client.channels.cache.get(client.config.channels[3].id) as TextChannel;

				if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.REJECTED) {
					return interaction.editReply({
						content: `\`⚠️\` Report #${reportId} is already **${report.status}** and cannot be updated further.`,
					});
				}

				if (action === 'preview') {
					await client.prisma.report.update({
						where: { id: reportId },
						data: { status: ReportStatus.UNDER_REVIEW },
					});

					await sendReportLog(client, ReportLogChannel, reportId, 'Under Review');

					return interaction.editReply({
						content: `\`👀\` **Previewing Report #${reportId}**\n\n**Description:** ${report.description}\n\n**Evidence:** ${JSON.stringify(report.evidence, null, 2)}`,
					});
				}

				if (action === 'resolved') {
					await client.prisma.report.update({
						where: { id: reportId },
						data: { status: ReportStatus.RESOLVED },
					});
					const flaggedUser = await client.users.fetch(report.reportedId);

					await client.prisma.users.upsert({
						where: { userId: flaggedUser.id },
						update: {
							last_username: flaggedUser.username,
							last_avatar: flaggedUser.displayAvatarURL(),
							status: WatchdogStatus.FLAGGED,
							reason: report.description,
							evidence: JSON.parse(JSON.stringify(report.screenshots)) as any,
						},
						create: {
							userId: flaggedUser.id,
							last_username: flaggedUser.username,
							last_avatar: flaggedUser.displayAvatarURL(),
							status: WatchdogStatus.FLAGGED,
							reason: report.description,
							evidence: JSON.parse(JSON.stringify(report.screenshots)) as any,
						},
					});

					await sendReportLog(client, ReportLogChannel, reportId, 'Resolved');

					return interaction.editReply({
						content: `\`✅\` Report #${reportId} marked as **RESOLVED** by ${interaction.user.username}`,
					});
				}

				if (action === 'rejected') {
					await client.prisma.report.update({
						where: { id: reportId },
						data: { status: ReportStatus.REJECTED },
					});

					await sendReportLog(client, ReportLogChannel, reportId, 'Rejected');

					return interaction.editReply({
						content: `\`❌\` Report #${reportId} marked as **REJECTED** by ${interaction.user.username}`,
					});
				}
			} else if (interaction.customId === 'startAppeal') {
				const existingInFlagged = await client.prisma.users.findUnique({ where: { userId: interaction.user.id } });
				if (!existingInFlagged) {
					return interaction.reply({
						content: '`❌` You are not flagged and cannot submit an appeal.',
						flags: ['Ephemeral'],
					});
				}

				if (existingInFlagged.status === 'PERM_FLAGGED' || existingInFlagged.status === 'FLAGGED') {
					// allow appeal normally
				} else if (existingInFlagged.status === 'APPEALED') {
					return interaction.reply({
						content: '`✅` Your account has already been cleared. No appeal is necessary.',
						flags: ['Ephemeral'],
					});
				}

				const existing = await client.prisma.appeal.findFirst({
					where: { userId: interaction.user.id },
					orderBy: { createdAt: 'desc' },
				});

				if (existing) {
					const fourteenDays = 14 * 24 * 60 * 60 * 1000; // 14 days in ms
					const now = new Date();
					const appealAge = now.getTime() - existing.createdAt.getTime();

					if (appealAge >= fourteenDays) {
						// Old appeal, allow new appeal
					} else {
						let message =
							'`❌` You already have an active appeal. You cannot submit another until the previous appeal is denied.';

						if (existing.status === 'APPROVED') {
							message = '`✅` Your previous appeal was approved. No new appeal can be submitted.';
						} else if (existing.status === 'PENDING') {
							message = '`⏳` You already have a pending appeal. Please wait until it is reviewed.';
						} else if (existing.status === 'DENIED') {
							message = '`❌` Your last appeal was denied. Please wait 14 days before submitting a new one.';
						}

						return interaction.reply({ content: message, flags: ['Ephemeral'] });
					}
				}

				const modal = new ModalBuilder().setCustomId('appealModal').setTitle('Submit Your Appeal - Watchdog');

				const reasonInput = new TextInputBuilder()
					.setCustomId('appealReason')
					.setLabel('Why should we approve your appeal?')
					.setStyle(TextInputStyle.Paragraph)
					.setPlaceholder('Explain your situation...')
					.setRequired(true);

				const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
				modal.addComponents(row);

				await interaction.showModal(modal);
			}
		}
	},
};

export default event;
