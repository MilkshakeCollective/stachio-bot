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
		.setName('antiphish')
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
		.addSubcommand((sub) => sub.setName('status').setDescription('View current Anti-Phish settings'))
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
		),

	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const guildId = interaction.guildId!;
		const sub = interaction.options.getSubcommand();

		await interaction.deferReply({ flags: ['Ephemeral'] });

		let settings = await client.prisma.antiPhishSettings.findUnique({ where: { guildId } });

		// Helper to safely convert Prisma JSON arrays to string[]
		const toStringArray = (value: unknown): string[] =>
			Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

		if (!settings && sub !== 'setup') {
			return interaction.editReply('`⚠️` No Anti-Phish settings found. Run `/antiphish setup` first.');
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
				await client.prisma.antiPhishSettings.update({
					where: { guildId },
					data: { ignoredRoles: updatedRoles, ignoredUsers: updatedUsers, ignoredChannels: updatedChannels },
				});
			} else {
				await client.prisma.antiPhishSettings.create({
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
						.setTitle('✅ Anti-Phish Setup Complete')
						.setColor('Green')
						.setDescription(
							[
								`**Log Channel:** ${logChannel ? `<#${logChannel}>` : '`Not set`'}`,
								`**Ignored Role(s):** ${ignoredRole ? `<@&${ignoredRole}>` : '`None`'}`,
								`**Ignored User(s):** ${ignoredUser ? `<@${ignoredUser}>` : '`None`'}`,
								`**Ignored Channel(s):** ${ignoredChannel ? `<#${ignoredChannel}>` : '`None`'}`,
							].join('\n'),
						)
						.setFooter({ text: 'Anti-Phish will now use these settings.' }),
				],
			});
		}

		if (sub === 'status') {
			const ignoredRoles = toStringArray(settings!.ignoredRoles);
			const ignoredUsers = toStringArray(settings!.ignoredUsers);
			const ignoredChannels = toStringArray(settings!.ignoredChannels);

			return interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('🐾 Anti-Phish Settings')
						.setColor('Blurple')
						.setDescription(
							[
								`**Enabled:** ${settings!.enabled ? '`✅`' : '`❌`'}`,
								`**Ignored Roles:** ${ignoredRoles.length ? ignoredRoles.map((r) => `<@&${r}>`).join(', ') : '`None`'}`,
								`**Ignored Users:** ${ignoredUsers.length ? ignoredUsers.map((u) => `<@${u}>`).join(', ') : '`None`'}`,
								`**Ignored Channels:** ${ignoredChannels.length ? ignoredChannels.map((c) => `<#${c}>`).join(', ') : '`None`'}`,
							].join('\n'),
						)
						.setFooter({ text: `Guild ID: ${guildId}` })
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

			if (!id) return interaction.editReply(`You must provide a ${type}.`);

			if (sub === 'add' && !current.includes(id)) current.push(id);
			if (sub === 'remove') current = current.filter((i) => i !== id);

			await client.prisma.antiPhishSettings.update({
				where: { guildId },
				data:
					type === 'role'
						? { ignoredRoles: current }
						: type === 'user'
							? { ignoredUsers: current }
							: { ignoredChannels: current },
			});

			return interaction.editReply({
				content: `\`✅\` Successfully ${sub === 'add' ? 'added' : 'removed'} ${type}.`,
			});
		}
	},
};

export default command;
