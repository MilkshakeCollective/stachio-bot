import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	ChannelType,
	EmbedBuilder,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('watchdog')
		.setDescription('⚙️ Manage Watchdog (flagged system)')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) =>
			sub
				.setName('setup')
				.setDescription('Configure Watchdog settings')
				.addChannelOption((opt) =>
					opt
						.setName('log_channel')
						.setDescription('Channel for Watchdog logs')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true),
				)
				.addRoleOption((opt) =>
					opt.setName('flagged_role').setDescription('Role to assign when a user is flagged').setRequired(false),
				)
				.addStringOption((opt) =>
					opt
						.setName('action_on_flag')
						.setDescription('What action to take when a user is flagged')
						.addChoices(
							{ name: 'Warn', value: 'WARN' },
							{ name: 'Kick', value: 'KICK' },
							{ name: 'Ban', value: 'BAN' },
							{ name: 'Role', value: 'ROLE' },
						)
						.setRequired(false),
				)
				.addStringOption((opt) =>
					opt
						.setName('action_on_perm')
						.setDescription('What action to take when a user is permanently flagged')
						.addChoices(
							{ name: 'Warn', value: 'WARN' },
							{ name: 'Kick', value: 'KICK' },
							{ name: 'Ban', value: 'BAN' },
							{ name: 'Role', value: 'ROLE' },
						)
						.setRequired(false),
				)
				.addStringOption((opt) =>
					opt
						.setName('action_on_auto')
						.setDescription('What action to take when a user is automatically flagged')
						.addChoices(
							{ name: 'Warn', value: 'WARN' },
							{ name: 'Kick', value: 'KICK' },
							{ name: 'Ban', value: 'BAN' },
							{ name: 'Role', value: 'ROLE' },
						)
						.setRequired(false),
				),
		)
		.addSubcommand((sub) => sub.setName('status').setDescription('View the current Watchdog settings')),

	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const guildId = interaction.guildId!;

		if (interaction.options.getSubcommand() === 'setup') {
			await interaction.deferReply({ flags: ['Ephemeral'] });

			const logChannel = interaction.options.getChannel('log_channel')?.id ?? null;
			const roleId = interaction.options.getRole('flagged_role')?.id ?? null;
			const actionOnFlag = (interaction.options.getString('action_on_flag') ?? 'KICK') as any;
			const actionOnPerm = (interaction.options.getString('action_on_perm') ?? 'KICK') as any;
			const actionOnAuto = (interaction.options.getString('action_on_auto') ?? 'KICK') as any;

			await client.prisma.flaggedSettings.upsert({
				where: { guildId },
				update: {
					logChannelId: logChannel,
					roleId,
					actionOnFlag,
					actionOnPerm,
					actionOnAuto,
				},
				create: {
					guildId,
					logChannelId: logChannel,
					roleId,
					actionOnFlag,
					actionOnPerm,
					actionOnAuto,
				},
			});

			const embed = new EmbedBuilder()
				.setTitle('✅ Watchdog Setup Complete')
				.setColor('Green')
				.setDescription(
					[
						`**Logs:** ${logChannel ? `<#${logChannel}>` : '`Not set`'}`,
						`**Role:** ${roleId ? `<@&${roleId}>` : '`Not set`'}`,
						'',
						'**Actions:**',
						`• Flagged → \`${actionOnFlag}\``,
						`• Perm Flagged → \`${actionOnPerm}\``,
						`• Auto Flagged → \`${actionOnAuto}\``,
					].join('\n'),
				)
				.setFooter({ text: 'Watchdog v2 will activate these settings automatically.' });

			return interaction.editReply({ embeds: [embed] });
		}

		if (interaction.options.getSubcommand() === 'status') {
			await interaction.deferReply({ flags: 'Ephemeral' });

			const settings = await client.prisma.flaggedSettings.findUnique({
				where: { guildId },
			});

			if (!settings) {
				return interaction.editReply({
					content: '`⚠️` No Watchdog settings found. Run `/watchdog setup` first.',
				});
			}

			const embed = new EmbedBuilder()
				.setTitle('🐾 Watchdog Settings')
				.setColor('Blurple')
				.setDescription(
					[
						`**Enabled:** ${settings.enabled ? '`✅`' : '`❌`'}`,
						`**Log Channel:** ${settings.logChannelId ? `<#${settings.logChannelId}>` : '`Not set`'}`,
						`**Role:** ${settings.roleId ? `<@&${settings.roleId}>` : '`Not set`'}`,
						'',
						'**Actions:**',
						`• Flagged → \`${settings.actionOnFlag}\``,
						`• Perm Flagged → \`${settings.actionOnPerm}\``,
						`• Auto Flagged → \`${settings.actionOnAuto}\``,
					].join('\n'),
				)
				.setFooter({ text: `Guild ID: ${guildId}` })
				.setTimestamp();

			return interaction.editReply({ embeds: [embed] });
		}
	},
};

export default command;
