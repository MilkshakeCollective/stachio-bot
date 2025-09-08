import { HelperClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	Client,
	TextChannel,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: true,
	data: new SlashCommandBuilder()
		.setName('ticket-panel')
		.setDescription('Send the ticket panel messages in the configured channels')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	execute: async (interaction: ChatInputCommandInteraction, client: HelperClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const guild = client.guilds.cache.get(client.config.guilds[0].id);
		if (!guild) return interaction.editReply({ content: 'Guild not found.' });

		const panels = [
			{
				channelId: client.config.channels[3].id,
				label: 'Apply For Staff',
				style: ButtonStyle.Danger,
				type: 'apply',
				message: ['## **`Staff Applications!`**', '> ***Want to Join the Team?***', '> Start an Application!'].join(
					'\n',
				),
			},
			{
				channelId: client.config.channels[4].id,
				label: 'Report A User',
				style: ButtonStyle.Danger,
				type: 'report',
				message: [
					'## **`Found a Suspicious User?`**',
					'> ***Notice suspicious activity or rule-breaking?***',
					'> Open a Ticket to Report Them Safely!',
				].join('\n'),
			},
			{
				channelId: client.config.channels[5].id,
				label: 'Contact A Staff',
				style: ButtonStyle.Primary,
				type: 'staff',
				message: ['## **`Contact A Staff!`**', '> ***Need assistance?***', '> Create a Ticket to get help.'].join('\n'),
			},
			{
				channelId: client.config.channels[6].id,
				label: 'Appeal Your Mark',
				style: ButtonStyle.Secondary,
				type: 'appeal',
				message: [
					'## **`Appeal your Mark!`**',
					'> ***Got Marked, Blacklisted or Banned?***',
					'> Create a Ticket to Appeal.',
				].join('\n'),
			},
		];

		for (const panel of panels) {
			const channel = guild.channels.cache.get(panel.channelId) as TextChannel;
			if (!channel) continue;

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId(`ticket_create_${panel.type}`).setLabel(panel.label).setStyle(panel.style),
			);

			await channel.send({ content: panel.message, components: [row] });
		}

		return interaction.editReply({ content: 'Ticket panels have been sent successfully!' });
	},
};

export default command;
