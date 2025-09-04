import { MilkshakeClient, t } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
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
		.setName('antiphishing')
		.setDescription('⚙️ Manage Anti-Phishing settings')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) =>
			sub
				.setName('setup')
				.setDescription('Configure Anti-Phishing settings')
				.addChannelOption((opt) =>
					opt
						.setName('log_channel')
						.setDescription('Channel for Anti-Phish logs')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true),
				)
				.addRoleOption((opt) => opt.setName('ignored_role').setDescription('Role to ignore').setRequired(false))
				.addUserOption((opt) => opt.setName('ignored_user').setDescription('User to ignore').setRequired(false))
				.addChannelOption((opt) =>
					opt.setName('ignored_channel').setDescription('Channel to ignore').setRequired(false),
				),
		)
		.addSubcommand((sub) => sub.setName('settings').setDescription('View current Anti-Phish settings'))
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add ignored user, role, or channel')
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('What to ignore')
						.setRequired(true)
						.addChoices(
							{ name: 'Role', value: 'role' },
							{ name: 'User', value: 'user' },
							{ name: 'Channel', value: 'channel' },
						),
				)
				.addRoleOption((opt) => opt.setName('role').setDescription('Role to ignore'))
				.addUserOption((opt) => opt.setName('user').setDescription('User to ignore'))
				.addChannelOption((opt) => opt.setName('channel').setDescription('Channel to ignore')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove ignored user, role, or channel')
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('What to remove from ignore')
						.setRequired(true)
						.addChoices(
							{ name: 'Role', value: 'role' },
							{ name: 'User', value: 'user' },
							{ name: 'Channel', value: 'channel' },
						),
				)
				.addRoleOption((opt) => opt.setName('role').setDescription('Role to remove'))
				.addUserOption((opt) => opt.setName('user').setDescription('User to remove'))
				.addChannelOption((opt) => opt.setName('channel').setDescription('Channel to remove')),
		)
		.addSubcommand((sub) => sub.setName('toggle').setDescription('Enable or disable Anti-Phish')),

	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const guildId = interaction.guildId!;
		const sub = interaction.options.getSubcommand();

		await interaction.deferReply({ flags: ['Ephemeral'] });

		let settings = await client.prisma.antiPhishingConfig.findUnique({ where: { guildId } });

		// Helper to safely convert Prisma JSON arrays to string[]
		const toStringArray = (value: unknown): string[] =>
			Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

		if (!settings && sub !== 'setup') {
			return interaction.editReply(await t(interaction.guild!.id, 'commands.management.antiphishing.setup.noData'));
		}

		if (sub === 'setup') {
			const logChannel = interaction.options.getChannel('log_channel')?.id ?? null;
			const ignoredRole = interaction.options.getRole('ignored_role')?.id ?? null;
			const ignoredUser = interaction.options.getUser('ignored_user')?.id ?? null;
			const ignoredChannel = interaction.options.getChannel('ignored_channel')?.id ?? null;

			const updatedRoles = [...toStringArray(settings?.ignoredRoles), ...(ignoredRole ? [ignoredRole] : [])];
			const updatedUsers = [...toStringArray(settings?.ignoredUsers), ...(ignoredUser ? [ignoredUser] : [])];
			const updatedChannels = [
				...toStringArray(settings?.ignoredChannels),
				...(ignoredChannel ? [ignoredChannel] : []),
			];

			if (settings) {
				await client.prisma.antiPhishingConfig.update({
					where: { guildId },
					data: { ignoredRoles: updatedRoles, ignoredUsers: updatedUsers, ignoredChannels: updatedChannels },
				});
			} else {
				await client.prisma.antiPhishingConfig.create({
					data: {
						guildId,
						ignoredRoles: updatedRoles,
						ignoredUsers: updatedUsers,
						ignoredChannels: updatedChannels,
						enabled: true,
					},
				});
			}

			return interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed.title'))
						.setColor(client.config.colors.success)
						.setDescription(
							[
								`${await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed._1')} ${logChannel ? `<#${logChannel}>` : await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed._5')}`,
								`${await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed._2')} ${ignoredRole ? `<@&${ignoredRole}>` : await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed._5')}`,
								`${await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed._3')} ${ignoredUser ? `<@${ignoredUser}>` : await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed._5')}`,
								`${await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed._4')} ${ignoredChannel ? `<#${ignoredChannel}>` : await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed._5')}`,
							].join('\n'),
						)
						.setFooter({ text: await t(interaction.guild!.id, 'commands.management.antiphishing.setup.embed.footer') }),
				],
			});
		}

		if (sub === 'settings') {
			const ignoredRoles = toStringArray(settings!.ignoredRoles);
			const ignoredUsers = toStringArray(settings!.ignoredUsers);
			const ignoredChannels = toStringArray(settings!.ignoredChannels);

			return interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(await t(interaction.guild!.id, 'commands.management.antiphishing.settings.title'))
						.setColor(client.config.colors.primary)
						.setDescription(
							[
								await t(interaction.guild!.id, 'commands.management.antiphishing.settings.enabled', {
									state: settings!.enabled ? '`✅`' : '`❌`',
								}),
								await t(interaction.guild!.id, 'commands.management.antiphishing.settings.roles', {
									roles: ignoredRoles.length
										? ignoredRoles.map((r) => `<@&${r}>`).join(', ')
										: await t(interaction.guild!.id, 'commands.management.antiphishing.settings.none'),
								}),
								await t(interaction.guild!.id, 'commands.management.antiphishing.settings.users', {
									users: ignoredUsers.length
										? ignoredUsers.map((u) => `<@${u}>`).join(', ')
										: await t(interaction.guild!.id, 'commands.management.antiphishing.settings.none'),
								}),
								await t(interaction.guild!.id, 'commands.management.antiphishing.settings.channels', {
									channels: ignoredChannels.length
										? ignoredChannels.map((c) => `<#${c}>`).join(', ')
										: await t(interaction.guild!.id, 'commands.management.antiphishing.settings.none'),
								}),
							].join('\n'),
						)
						.setFooter({
							text: await t(interaction.guild!.id, 'commands.management.antiphishing.settings.footer', { guildId }),
						})
						.setTimestamp(),
				],
			});
		}

		if (sub === 'add' || sub === 'remove') {
			const type = interaction.options.getString('type', true);
			let current =
				type === 'role'
					? toStringArray(settings!.ignoredRoles)
					: type === 'user'
						? toStringArray(settings!.ignoredUsers)
						: toStringArray(settings!.ignoredChannels);

			let id: string | undefined;
			if (type === 'role') id = interaction.options.getRole('role')?.id;
			if (type === 'user') id = interaction.options.getUser('user')?.id;
			if (type === 'channel') id = interaction.options.getChannel('channel')?.id;

			if (!id) {
				return interaction.editReply(
					await t(interaction.guild!.id, 'commands.management.antiphishing.addRemove.noId', { type }),
				);
			}

			if (sub === 'add' && !current.includes(id)) current.push(id);
			if (sub === 'remove') current = current.filter((i) => i !== id);

			await client.prisma.antiPhishingConfig.update({
				where: { guildId },
				data:
					type === 'role'
						? { ignoredRoles: current }
						: type === 'user'
							? { ignoredUsers: current }
							: { ignoredChannels: current },
			});

			return interaction.editReply(
				await t(
					interaction.guild!.id,
					`commands.management.antiphishing.addRemove.${sub === 'add' ? 'added' : 'removed'}`,
					{ type },
				),
			);
		}

		if (sub === 'toggle') {
			const newState = !settings!.enabled;
			await client.prisma.antiPhishingConfig.update({
				where: { guildId },
				data: { enabled: newState },
			});

			return interaction.editReply({
				content: await t(
					interaction.guild!.id,
					`commands.management.antiphishing.toggle.${newState ? 'enabled' : 'disabled'}`,
				),
			});
		}
	},
};

export default command;
