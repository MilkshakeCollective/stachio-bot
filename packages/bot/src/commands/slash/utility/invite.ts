import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
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
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user?.id}`;

		const embed = new EmbedBuilder()
			.setTitle('📩 Invite Stachio')
			.setDescription(
				[
					'Thanks for choosing **Stachio** — your community guardian! 💚',
					'',
					'With Stachio, your server gets:',
					'- `👁️` **Watchdog**: Global ban protection against repeat offenders',
					'- `🛡️` **Anti-Phishing**: Blocks malicious links automatically',
					'- `📑` **Report System**: Members can flag issues for review',
					'- `⚖️` **Appeals**: Fair review process for flagged users',
					'- `🌍` **Multi-language Support**: Moderation for communities worldwide',
					'',
					'Click the button below to add Stachio and make your community safer today!',
				].join('\n'),
			)
			.setColor(client.config.colors.primary)
			.setFooter({ text: 'Stachio • Protecting communities since 2025' })
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
