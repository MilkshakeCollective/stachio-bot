import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

const command: CommandInterface = {
	cooldown: 2,
	isDeveloperOnly: true,
	data: new SlashCommandBuilder()
		.setName('emit')
		.setDescription('Manually emit a Discord.js event for testing')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addStringOption((option) =>
			option
				.setName('event')
				.setDescription('Name of the event to emit (e.g. guildCreate, messageCreate)')
				.setRequired(true)
				.addChoices({ name: 'guildCreate', value: 'guildCreate' }, { name: 'guildDelete', value: 'guildDelete' }),
		)
		.addStringOption((option) =>
			option.setName('guild').setDescription('Guild id for the guild you want to emit to.').setRequired(false),
		),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const targetGuild = interaction.options.getString('guild', false);
		const eventName = interaction.options.getString('event', true);

		try {
			switch (eventName) {
				case 'guildCreate': {
					const guild = client.guilds.cache.get(targetGuild! ?? interaction.guild!.id);
					if (!guild) {
						return interaction.editReply({
							content: 'No guild found in cache to emit guildCreate for.',
						});
					}
					client.emit('guildCreate', guild);
					break;
				}
				case 'guildDelete': {
					const guild = client.guilds.cache.get(targetGuild! ?? interaction.guild!.id);
					if (!guild) {
						return interaction.editReply({
							content: 'No guild found in cache to emit guildDelete for.',
						});
					}
					client.emit('guildDelete', guild);
					break;
				}
				default:
					return interaction.editReply({
						content: `Event "${eventName}" is not supported for manual emit.`,
					});
			}

			return interaction.editReply({
				content: `✅ Event \`${eventName}\` emitted successfully!`,
			});
		} catch (error) {
			console.error('Error emitting event:', error);
			return interaction.editReply({
				content: `❌ Failed to emit event \`${eventName}\`.`,
			});
		}
	},
};

export default command;
