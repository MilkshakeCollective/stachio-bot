import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
import {
	ActionRowBuilder,
	ButtonInteraction,
	Events,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';

const event: EventInterface = {
	name: Events.InteractionCreate,
	options: { once: false, rest: false },
	execute: async function (interaction: ButtonInteraction, client: MilkshakeClient) {
		if (interaction.customId !== 'startAppeal') return;

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
	},
};

export default event;
