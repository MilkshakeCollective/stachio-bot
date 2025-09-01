import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
import { Events, ModalSubmitInteraction, EmbedBuilder, TextChannel } from 'discord.js';

const event: EventInterface = {
	name: Events.InteractionCreate,
	options: { once: false, rest: false },
	execute: async function (interaction: ModalSubmitInteraction, client: MilkshakeClient) {
		if (interaction.customId !== 'appealModal') return;

		await interaction.deferReply({ flags: ['Ephemeral'] });

		const reason = interaction.fields.getTextInputValue('appealReason');

		try {
			const appeal = await client.prisma.appeal.create({
				data: {
					userId: interaction.user.id,
					reason,
					status: 'PENDING',
				},
			});

			const logChannel = client.channels.cache.get(client.config.channels[1].id) as TextChannel;
			if (logChannel) {
				const embed = new EmbedBuilder()
					.setTitle('📩 New Appeal Submitted')
					.setColor(client.config.colors.primary)
					.setThumbnail(interaction.user.displayAvatarURL())
					.setDescription(
						[
							`**User:** ${interaction.user.tag} (${interaction.user.id})`,
							`**Reason:** ${reason}`,
							`**Status:** ${appeal.status}`,
							`**Submitted At:** <t:${Math.floor(Date.now() / 1000)}:F>`,
						].join('\n'),
					)
					.setFooter({ text: 'Watchdog System' })
					.setTimestamp();

				await logChannel.send({ embeds: [embed] });
			}

			await interaction.editReply({
				content: '`✅` Your appeal has been submitted. Staff will review it soon.',
			});
		} catch (err: any) {
			if (err.code === 'P2002') {
				return interaction.editReply({
					content: '`❌` You already have a pending appeal. Please wait until it is reviewed.',
				});
			} else {
				console.error(err);
				return interaction.editReply({
					content: '`❌` Something went wrong while submitting your appeal.',
				});
			}
		}
	},
};

export default event;
