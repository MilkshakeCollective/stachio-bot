import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	ChannelType,
	EmbedBuilder,
} from 'discord.js';

type WatchdogAction = 'WARN' | 'KICK' | 'BAN' | 'ROLE';

const ACTIONS: WatchdogAction[] = ['WARN', 'KICK', 'BAN', 'ROLE'];

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
					opt.setName('flagged_role').setDescription('Role to assign when flagged').setRequired(false),
				)
				.addStringOption((opt) =>
					opt
						.setName('action_on_flag')
						.setDescription('Action when a user is flagged')
						.addChoices(...ACTIONS.map((a) => ({ name: a, value: a })))
						.setRequired(false),
				)
				.addStringOption((opt) =>
					opt
						.setName('action_on_perm')
						.setDescription('Action when a user is permanently flagged')
						.addChoices(...ACTIONS.map((a) => ({ name: a, value: a })))
						.setRequired(false),
				)
				.addStringOption((opt) =>
					opt
						.setName('action_on_auto')
						.setDescription('Action when a user is automatically flagged')
						.addChoices(...ACTIONS.map((a) => ({ name: a, value: a })))
						.setRequired(false),
				),
		)
		.addSubcommand((sub) => sub.setName('status').setDescription('View current Watchdog settings'))
		.addSubcommand((sub) =>
			sub
				.setName('toggle')
				.setDescription('Enable or disable Watchdog')
				.addBooleanOption((opt) =>
					opt.setName('enabled').setDescription('Set to true to enable, false to disable').setRequired(true),
				),
		),

	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const guildId = interaction.guildId!;
		const sub = interaction.options.getSubcommand();

		await interaction.deferReply({ flags: ['Ephemeral'] });

		const settings = await client.prisma.watchdogConfig.findUnique({ where: { guildId } });

		if (sub === 'setup') {
			const logChannel = interaction.options.getChannel('log_channel')?.id ?? null;
			const roleId = interaction.options.getRole('flagged_role')?.id ?? null;

			const actionOnFlag = (interaction.options.getString('action_on_flag') ?? 'KICK') as WatchdogAction;
			const actionOnPerm = (interaction.options.getString('action_on_perm') ?? 'KICK') as WatchdogAction;
			const actionOnAuto = (interaction.options.getString('action_on_auto') ?? 'KICK') as WatchdogAction;

			await client.prisma.watchdogConfig.upsert({
				where: { guildId },
				update: { logChannelId: logChannel, roleId, actionOnFlag, actionOnPerm, actionOnAuto, enabled: true },
				create: { guildId, logChannelId: logChannel, roleId, actionOnFlag, actionOnPerm, actionOnAuto, enabled: true },
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

		if (sub === 'status') {
			if (!settings) {
				return interaction.editReply({ content: '`⚠️` No Watchdog settings found. Run `/watchdog setup` first.' });
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

		if (sub === 'toggle') {
			const enabled = interaction.options.getBoolean('enabled', true);

			if (!settings) {
				return interaction.editReply({ content: '`⚠️` No Watchdog settings found. Run `/watchdog setup` first.' });
			}

			await client.prisma.watchdogConfig.update({
				where: { guildId },
				data: { enabled },
			});

			return interaction.editReply({
				content: `\`✅\` Watchdog has been **${enabled ? 'enabled' : 'disabled'}**.`,
			});
		}
	},
};

export default command;
