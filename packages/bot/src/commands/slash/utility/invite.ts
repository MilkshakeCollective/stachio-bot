import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('Invite our bot to your server!')
		.setNSFW(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ["Ephemeral"] });

		const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user?.id}`;

		const embed = new EmbedBuilder()
			.setTitle('📩 Invite Online Safety')
			.setDescription(
				[
					'Thanks for choosing **Online Safety**!',
					' ',
					"With this bot, you'll get:",
					'- `🛡️` Automatic moderation',
					'- `📊` Safety reports & logs',
					'- `⚙️` Easy setup and customization',
					'',
					'Click the button below to invite Online Safety to your server.  ',
					'Help us make Discord a safer place for everyone!',
				].join('\n'),
			)
			.setColor('Blurple')
			.setFooter({ text: 'Online Safety • Protecting communities since 2025' })
			.setTimestamp();

		const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setLabel('Invite the Bot').setStyle(ButtonStyle.Link).setURL(inviteUrl),
		);

		return interaction.editReply({
			embeds: [embed],
			components: [button],
		});
	},
};

export default command;
