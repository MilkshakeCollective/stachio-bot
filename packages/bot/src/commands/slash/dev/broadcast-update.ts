import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const command: CommandInterface = {
	cooldown: 30,
	isDeveloperOnly: true, // only devs can run this
	data: new SlashCommandBuilder()
		.setName('broadcast-update')
		.setDescription('Send an update message to all server owners')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const updateMessage = [
			'📢 **Stachio Update Notice (2.0.0 BETA)**',
			'',
			'We are currently rolling out a **major update** to improve performance, stability, and security.',
			'⚠️ **Important:** As part of this update, our bot database will be **completely reset**.',
			'',
			'👉 This means all previous configurations are wiped, and every server will need to **set up Stachio again from scratch**.',
			'',
			'We understand this may cause inconvenience, but this reset ensures a clean, optimized foundation for the future of Stachio.',
			'',
			'💡 Setup guides and support are available on our [official Discord](https://stachio.dk/discord).',
			'',
			'⚠️ Please note: Errors or translation mistakes may occur during this beta. If you encounter any, feel free to report them in our support server.',
			'',
			'Thank you for your patience and continued support 💙',
		].join('\n');

		let sent = 0;
		let failed = 0;

		for (const [guildId, guild] of client.guilds.cache) {
			try {
				const owner = await guild.fetchOwner();
				if (owner) {
					await owner.send(updateMessage);
					sent++;
				}
			} catch {
				failed++;
			}
		}

		return interaction.editReply(
			`✅ Sent update message to **${sent}** server owners. Failed to send to **${failed}**.`,
		);
	},
};

export default command;
