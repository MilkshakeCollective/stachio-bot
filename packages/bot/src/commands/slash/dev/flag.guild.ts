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
	cooldown: 2,
	isDeveloperOnly: true,
	data: new SlashCommandBuilder()
		.setName('flag-guild')
		.setDescription('Manage flagged guilds')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Flag a guild')
				.addStringOption((opt) => opt.setName('guild').setDescription('Guild ID').setRequired(true))
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('Type of guild')
						.setRequired(true)
						.addChoices(
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
						),
				)
				.addStringOption((opt) =>
					opt.setName('name').setDescription('Custom guild name (optional if bot not in guild)'),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('Reason for flagging')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('update')
				.setDescription('Update a flagged guild')
				.addStringOption((opt) => opt.setName('guild').setDescription('Guild ID').setRequired(true))
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('New guild type')
						.setRequired(false)
						.addChoices(
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
						),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('New reason')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Unflag a guild')
				.addStringOption((opt) => opt.setName('guild').setDescription('Guild ID').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('info')
				.setDescription('Get info about a flagged guild')
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
				if (existing)
					return interaction.reply({
						content: '`⚠️` This guild is already flagged.',
						flags: ['Ephemeral'],
					});

				let name: string | null = customName ?? null;
				let icon: string | null = null;

				if (!customName) {
					try {
						const guild = await client.guilds.fetch(guildId);
						name = guild.name;
						icon = guild.iconURL();
					} catch {
					}
				}

				await client.prisma.guilds.create({
					data: {
						guildId,
						name,
						icon,
						type,
						reason,
					},
				});

				const logEmbed = new EmbedBuilder()
					.setColor(client.config.colors.error)
					.setTitle('🚩 Guild Flagged')
					.setThumbnail(icon)
					.setColor(client.config.colors.primary)
					.setDescription(
						[
							`**Guild:** ${name ?? 'Unknown'} (\`${guildId}\`)`,
							`**Type:** ${type}`,
							`**Reason:** ${reason}`,
							`**Flagged by:** ${interaction.user.tag}`,
						].join('\n'),
					)
					.setTimestamp();

				const guildLogChannel = client.channels.cache.get(client.config.channels[4].id) as TextChannel;
				if (guildLogChannel) guildLogChannel.send({ embeds: [logEmbed] });

				return interaction.reply({
					content: `\`✅\` Guild \`${guildId}\` has been flagged as **${type}**.`,
					flags: ['Ephemeral'],
				});
			}

			case 'update': {
				const existing = await client.prisma.guilds.findUnique({ where: { guildId } });
				if (!existing) return interaction.reply({ content: '`⚠️` This guild is not flagged.', flags: ['Ephemeral'] });

				await client.prisma.guilds.update({
					where: { guildId },
					data: {
						type: type ?? existing.type,
						reason: reason ?? existing.reason,
					},
				});

				return interaction.reply({
					content: `\`✏️\` Updated flagged guild \`${guildId}\`.`,
					flags: ['Ephemeral'],
				});
			}

			case 'remove': {
				const existing = await client.prisma.guilds.findUnique({ where: { guildId } });
				if (!existing) return interaction.reply({ content: '`⚠️` This guild is not flagged.', flags: ['Ephemeral'] });

				await client.prisma.guilds.delete({ where: { guildId } });
				return interaction.reply({ content: `\`🗑️\` Guild \`${guildId}\` has been unflagged.`, flags: ['Ephemeral'] });
			}

			case 'info': {
				const existing = await client.prisma.guilds.findUnique({ where: { guildId } });
				if (!existing) return interaction.reply({ content: '`⚠️` This guild is not flagged.', flags: ['Ephemeral'] });

				const embed = new EmbedBuilder()
					.setTitle(`🚩 Flag Info: ${existing.name ?? guildId}`)
					.addFields(
						{ name: 'Status', value: existing.status, inline: true },
						{ name: 'Type', value: existing.type, inline: true },
						{ name: 'Reason', value: existing.reason ?? 'None', inline: true },
					)
					.setColor(client.config.colors.secondary)
					.setFooter({ text: `Guild ID: ${existing.guildId}` })
					.setTimestamp();

				if (existing.icon) embed.setThumbnail(existing.icon);

				return interaction.reply({ embeds: [embed], flags: ['Ephemeral'] });
			}
		}
	},
};

export default command;
