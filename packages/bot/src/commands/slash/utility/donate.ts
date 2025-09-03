import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('donate')
		.setDescription('Support Stachio via Ko-fi! 💚')
		.setNSFW(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const kofiUrl = 'https://ko-fi.com/duckodas';

		const embed = new EmbedBuilder()
			.setTitle('🫂 Support Stachio')
			.setDescription(
				[
					'Stachio is built to keep your community safe and thriving! 💚',
					"If you'd like to support development, consider donating via Ko-fi:",
					`[Click here to donate](${kofiUrl})`,
				].join('\n\n'),
			)
			.setColor(client.config.colors.primary)
			.setFooter({ text: 'Thank you for supporting Stachio!' })
			.setTimestamp();

		const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setLabel('Donate via Ko-fi').setEmoji('💚').setStyle(ButtonStyle.Link).setURL(kofiUrl),
		);

		return interaction.reply({
			embeds: [embed],
			components: [button],
			flags: ['Ephemeral'],
		});
	},
};

export default command;
