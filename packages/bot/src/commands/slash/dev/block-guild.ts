import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
	TextChannel,
} from 'discord.js';

const GUILD_TYPES = [
	{ name: 'Community', value: 'COMMUNITY' },
	{ name: 'Bot Farm', value: 'BOT_FARM' },
	{ name: 'Partner', value: 'PARTNER' },
	{ name: 'Leaks', value: 'LEAKS' },
	{ name: 'Cheats', value: 'CHEATS' },
	{ name: 'Marketplace', value: 'MARKETPLACE' },
	{ name: 'RMT', value: 'RMT' },
	{ name: 'Exploits', value: 'EXPLOITS' },
	{ name: 'Gambling', value: 'GAMBLING' },
	{ name: 'Malware', value: 'MALWARE' },
	{ name: 'NSFW', value: 'NSFW' },
	{ name: 'Copycat', value: 'COPYCAT' },
	{ name: 'Extremism', value: 'EXTREMISM' },
];

const command: CommandInterface = {
	cooldown: 2,
	isDeveloperOnly: true,
	data: new SlashCommandBuilder()
		.setName('blacklist-guild')
		.setDescription('Manage blacklisted guilds')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Blacklist a guild')
				.addStringOption((opt) => opt.setName('guild').setDescription('Guild ID').setRequired(true))
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('Type of guild')
						.setRequired(true)
						.addChoices(...GUILD_TYPES),
				)
				.addStringOption((opt) =>
					opt.setName('name').setDescription('Custom guild name (optional if bot not in guild)'),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('Reason for blacklisting')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('update')
				.setDescription('Update a blacklisted guild')
				.addStringOption((opt) => opt.setName('guild').setDescription('Guild ID').setRequired(true))
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('New guild type')
						.setRequired(false)
						.addChoices(...GUILD_TYPES),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('New reason')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Unblacklist a guild')
				.addStringOption((opt) => opt.setName('guild').setDescription('Guild ID').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('info')
				.setDescription('Get info about a blacklisted guild')
				.addStringOption((opt) => opt.setName('guild').setDescription('Guild ID').setRequired(true)),
		),

	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const subcommand = interaction.options.getSubcommand();
		const guildId = interaction.options.getString('guild', true);
		const customName = interaction.options.getString('name');
		const type = interaction.options.getString('type') as any;
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		switch (subcommand) {
			case 'add': {
				const existing = await client.prisma.guilds.findUnique({ where: { guildId } });
				if (existing) return interaction.reply({ content: '⚠️ This guild is already blacklisted.', ephemeral: true });

				let name: string | null = customName ?? null;
				let icon: string | null = null;

				if (!customName) {
					try {
						const guild = await client.guilds.fetch(guildId);
						name = guild.name;
						icon = guild.iconURL() ?? null;
					} catch {
						name = name ?? 'Unknown';
					}
				}

				await client.prisma.guilds.create({
					data: { guildId, name, icon, type, reason },
				});

				const logEmbed = new EmbedBuilder()
					.setColor(client.config.colors.primary)
					.setTitle('🚫 Guild Blacklisted')
					.setThumbnail(icon)
					.setDescription(
						[
							`**Guild:** ${name} (\`${guildId}\`)`,
							`**Type:** ${type}`,
							`**Reason:** ${reason}`,
							`**Blacklisted by:** ${interaction.user.tag}`,
						].join('\n'),
					)
					.setTimestamp();

				const guildLogChannel = client.channels.cache.get(client.config.channels[4].id) as TextChannel;
				if (guildLogChannel) await guildLogChannel.send({ embeds: [logEmbed] });

				return interaction.reply({
					content: `✅ Guild \`${guildId}\` has been blacklisted as **${type}**.`,
					ephemeral: true,
				});
			}

			case 'update': {
				const existing = await client.prisma.guilds.findUnique({ where: { guildId } });
				if (!existing) return interaction.reply({ content: '⚠️ This guild is not blacklisted.', ephemeral: true });

				await client.prisma.guilds.update({
					where: { guildId },
					data: { type: type ?? existing.type, reason: reason ?? existing.reason },
				});

				return interaction.reply({
					content: `✏️ Updated blacklisted guild \`${guildId}\`.`,
					ephemeral: true,
				});
			}

			case 'remove': {
				const existing = await client.prisma.guilds.findUnique({ where: { guildId } });
				if (!existing) return interaction.reply({ content: '⚠️ This guild is not blacklisted.', ephemeral: true });

				await client.prisma.guilds.delete({ where: { guildId } });

				return interaction.reply({
					content: `🗑️ Guild \`${guildId}\` has been removed from blacklist.`,
					ephemeral: true,
				});
			}

			case 'info': {
				const existing = await client.prisma.guilds.findUnique({ where: { guildId } });
				if (!existing) return interaction.reply({ content: '⚠️ This guild is not blacklisted.', ephemeral: true });

				const embed = new EmbedBuilder()
					.setTitle(`🚫 Blacklist Info: ${existing.name ?? guildId}`)
					.addFields(
						{ name: 'Status', value: existing.status, inline: true },
						{ name: 'Type', value: existing.type, inline: true },
						{ name: 'Reason', value: existing.reason ?? 'None', inline: true },
					)
					.setColor(client.config.colors.secondary)
					.setFooter({ text: `Guild ID: ${existing.guildId}` })
					.setTimestamp();

				if (existing.icon) embed.setThumbnail(existing.icon);

				return interaction.reply({ embeds: [embed], ephemeral: true });
			}
		}
	},
};

export default command;
