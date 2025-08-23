import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import {
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
	ApplicationCommandType,
	PermissionFlagsBits,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 500,
	isDeveloperOnly: false,
	data: new ContextMenuCommandBuilder()
		.setName('Send Message')
		.setType(ApplicationCommandType.Message)
		.setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel),
	execute: async (interaction: ContextMenuCommandInteraction, client: MilkshakeClient) => {
		if (!interaction.isMessageContextMenuCommand()) return;

		const messageTargetId = interaction.targetId;
		const message = await interaction.channel?.messages.fetch(messageTargetId);

		try {
			await message?.author.send(`Hello, this message was sent though a context interaction.`);
			await interaction.reply({ content: 'Message sent successfully!', ephemeral: true });
		} catch (error) {
			await interaction.reply({ content: 'Failed to send message.', ephemeral: true });
		}
	},
};

export default command;
