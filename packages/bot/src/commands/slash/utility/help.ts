import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const command: CommandInterface = {
	cooldown: 10,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('View Stachio\'s commands and key features')
		.setNSFW(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const tips = [
			'`💡` Use `/report` to quickly alert staff about users in your community.',
			'`💡` Stachio automatically blocks known phishing links',
			'`💡` Support Stachio on Ko-fi to help fund hosting, development, and new features.',
			'`💡` Keep your moderation logs channel private to ensure sensitive data stays secure.',
			'`💡` Stachio also works automatically in the background with global bans, phishing protection, and detailed moderation logs.',
		];

		const embed = new EmbedBuilder()
			.setTitle('📖 Stachio Help Menu')
			.setDescription(
				[
					'Welcome to **Stachio** - your all-in-one community moderator.',
					'Use the commands below to get started and explore what Stachio can do for your server.',
					'### `⚙️` General',
					'🔹 **/invite** - Invite Stachio to your server',
					'🔹 **/donate** - Support development on Ko-fi',
					'### `🛡️` Safety & Moderation',
					'🔹 **/report** - Submit a safety or moderation report',
					'### `📢` Support & Appeals',
					'If your account is flagged and you wish to appeal, please visit our official Discord server at [stachio.dk/discord](https://stachio.dk/discord).',
					'### 🧾 Version & Info',
					`\`🔹\` **Version:** \`${client.config.version}\``,
					`\`🔹\` **Developer:** ${client.users.cache.get('711712752246325343')?.username} (${client.users.cache.get('711712752246325343')?.id})`,
					'',
					tips[Math.floor(Math.random() * tips.length)],
				].join('\n'),
			)
			.setColor(client.config.colors.primary)
			.setFooter({ text: 'Stachio • Protecting communities since 2025' })
			.setTimestamp();

		return interaction.editReply({ embeds: [embed] });
	},
};

export default command;
