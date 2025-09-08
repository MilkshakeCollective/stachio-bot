import { MilkshakeClient, t } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
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
		.setDescription('⚙️ Manage Watchdog')
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
					opt.setName('blocked_role').setDescription('Role to assign when blocked').setRequired(false),
				)
				.addStringOption((opt) =>
					opt
						.setName('action_on_blocked')
						.setDescription('Action when a user is blocked')
						.addChoices(...ACTIONS.map((a) => ({ name: a, value: a })))
						.setRequired(false),
				)
				.addStringOption((opt) =>
					opt
						.setName('action_on_perm')
						.setDescription('Action when a user is permanently blocked')
						.addChoices(...ACTIONS.map((a) => ({ name: a, value: a })))
						.setRequired(false),
				)
				.addStringOption((opt) =>
					opt
						.setName('action_on_auto')
						.setDescription('Action when a user is automatically blocked')
						.addChoices(...ACTIONS.map((a) => ({ name: a, value: a })))
						.setRequired(false),
				),
		)
		.addSubcommand((sub) => sub.setName('settings').setDescription('View current Watchdog settings'))
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
			const roleId = interaction.options.getRole('blocked_role')?.id ?? null;

			const actionOnBlocked = (interaction.options.getString('action_on_blocked') ?? 'KICK') as WatchdogAction;
			const actionOnPermBlocked = (interaction.options.getString('action_on_perm') ?? 'KICK') as WatchdogAction;
			const actionOnAutoBlocked = (interaction.options.getString('action_on_auto') ?? 'KICK') as WatchdogAction;

			await client.prisma.watchdogConfig.upsert({
				where: { guildId },
				update: { logChannelId: logChannel, roleId, actionOnBlocked, actionOnPermBlocked, actionOnAutoBlocked, enabled: true },
				create: { guildId, logChannelId: logChannel, roleId, actionOnBlocked, actionOnPermBlocked, actionOnAutoBlocked, enabled: true },
			});

			const embed = new EmbedBuilder()
				.setTitle(await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed.title'))
				.setColor(client.config.colors.success)
				.setDescription(
					[
						`${await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed._1')} ${logChannel ? `<#${logChannel}>` : await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed._3')}`,
						`${await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed._2')} ${roleId ? `<@&${roleId}>` : await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed._3')}`,
						'',
						await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed._4'),
						`${await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed._5')} \`${actionOnAutoBlocked}\``,
						`${await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed._6')} \`${actionOnPermBlocked}\``,
						`${await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed._7')} \`${actionOnAutoBlocked}\``,
					].join('\n'),
				)
				.setFooter({ text: await t(interaction.guild!.id, 'commands.management.watchdog.setup.embed.footer') });

			return interaction.editReply({ embeds: [embed] });
		}

		if (sub === 'settings') {
			if (!settings) {
				return interaction.editReply({
					content: await t(interaction.guild!.id, 'commands.management.watchdog.settings.noSettings'),
				});
			}

			const embed = new EmbedBuilder()
				.setTitle(await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed.title'))
				.setColor(client.config.colors.primary)
				.setDescription(
					[
						`${await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed._1')} ${settings.enabled ? '`✅`' : '`❌`'}`,
						`${await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed._2')} ${settings.logChannelId ? `<#${settings.logChannelId}>` : await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed._4')}`,
						`${await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed._3')} ${settings.roleId ? `<@&${settings.roleId}>` : await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed._4')}`,
						'',
						await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed._5'),
						`${await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed._6')} \`${settings.actionOnBlocked}\``,
						`${await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed._7')} \`${settings.actionOnPermBlocked}\``,
						`${await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed._8')} \`${settings.actionOnAutoBlocked}\``,
					].join('\n'),
				)
				.setFooter({
					text: await t(interaction.guild!.id, 'commands.management.watchdog.settings.embed.footer', { guildId }),
				})
				.setTimestamp();

			return interaction.editReply({ embeds: [embed] });
		}

		if (sub === 'toggle') {
			const enabled = interaction.options.getBoolean('enabled', true);

			if (!settings) {
				return interaction.editReply({
					content: await t(interaction.guild!.id, 'commands.management.watchdog.toggle.noSettings'),
				});
			}

			await client.prisma.watchdogConfig.update({
				where: { guildId },
				data: { enabled },
			});

			return interaction.editReply({
				content: await t(
					interaction.guild!.id,
					enabled ? 'commands.management.watchdog.toggle.enabled' : 'commands.management.watchdog.toggle.disabled',
				),
			});
		}
	},
};

export default command;
