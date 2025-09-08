import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
	TextChannel,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 30,
	isDeveloperOnly: true,
	data: new SlashCommandBuilder()
		.setName('broadcast-update')
		.setDescription('Send an update notice to all server owners')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addStringOption((opt) => opt.setName('link').setDescription('Link to the full update').setRequired(true))
		.addStringOption((opt) => opt.setName('summary').setDescription('Short summary of the update').setRequired(false)),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ ephemeral: true });

		const link = interaction.options.getString('link', true);
		const summary = interaction.options.getString('summary') ?? '📢 Major update available!';

		const embed = new EmbedBuilder()
			.setTitle('📢 Stachio Update Notice')
			.setDescription(`${summary}\n\nRead full update here: ${link}`)
			.setColor(client.config.colors.primary)
			.setFooter({ text: 'Stachio Bot - Update Broadcast' })
			.setTimestamp();

		let sent = 0;
		let failed = 0;

		for (const [_, guild] of client.guilds.cache) {
			try {
				const owner = await guild.fetchOwner();
				if (!owner) continue;

				await owner.send({ embeds: [embed] });
				sent++;
			} catch {
				failed++;
			}
			// small delay to avoid rate limits
			await new Promise((r) => setTimeout(r, 500));
		}

		await interaction.editReply(`✅ Sent update notice to **${sent}** server owners. Failed: **${failed}**.`);
	},
};

export default command;
