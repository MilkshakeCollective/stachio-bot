import { WatchdogStatus, GuildStatus } from '@prisma/client';
import { MilkshakeClient, t } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageComponentInteraction,
} from 'discord.js';

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += chunkSize) {
		chunks.push(arr.slice(i, i + chunkSize));
	}
	return chunks;
}

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('wd')
		.setDescription('Check a guild or a user if they\'re blacklisted & just view stats')
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
		.addSubcommandGroup((group) =>
			group
				.setName('check')
				.setDescription('Check a user or guild')
				.addSubcommand((sub) =>
					sub
						.setName('user')
						.setDescription('Check a user')
						.addUserOption((opt) => opt.setName('user').setDescription('The user to check').setRequired(true)),
				)
				.addSubcommand((sub) =>
					sub
						.setName('guild')
						.setDescription('Check a guild')
						.addStringOption((opt) => opt.setName('guildid').setDescription('Guild ID').setRequired(false)),
				),
		)
		.addSubcommand((sub) => sub.setName('stats').setDescription('Check overall Watchdog stats')),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const subcommandGroup = interaction.options.getSubcommandGroup(false);
		const subcommand = interaction.options.getSubcommand();

		switch (subcommandGroup) {
			case 'check':
				switch (subcommand) {
					case 'user': {
						const user = interaction.options.getUser('user', true);
						const blockedUser = await client.prisma.users.findUnique({ where: { userId: user.id } });

						if (!blockedUser)
							return interaction.editReply({
								content: await t(interaction.guild!.id, 'commands.utility.wd.user.noData', {
									user_name: user.username,
								}),
							});

						const foundAtArray = Array.isArray(blockedUser.foundAt)
							? (blockedUser.foundAt as Array<Record<string, any>>)
							: [];

						const infoEmbed = new EmbedBuilder()
							.setTitle(
								await t(interaction.guild!.id, 'commands.utility.wd.user.embed.title', {
									user_name: user.username,
								}),
							)
							.setColor(client.config.colors.error)
							.setDescription(
								[
									`${await t(interaction.guild!.id, 'commands.utility.wd.user.embed._1._1')} ${blockedUser.status ?? (await t(interaction.guild!.id, 'commands.utility.wd.user.embed._1._2'))}`,
									`${await t(interaction.guild!.id, 'commands.utility.wd.user.embed._2._1')} ${blockedUser.reason ?? (await t(interaction.guild!.id, 'commands.utility.wd.user.embed._2._2'))}`,
								].join('\n'),
							)
							.setThumbnail(user.displayAvatarURL())
							.setTimestamp();

						if (!foundAtArray.length) {
							return interaction.editReply({ embeds: [infoEmbed] });
						}

						// Chunk foundAtArray
						const chunks = chunkArray(
							foundAtArray.filter((entry) => entry && typeof entry === 'object'),
							5, // 5 entries per page
						);

						let currentPage = 0;

						const getPageEmbed = async (page: number) => {
							const entries = chunks[page]
								.map((entry) => {
									const type = typeof entry.type === 'string' ? entry.type : 'unknown';
									const guildName = typeof entry.guildName === 'string' ? entry.guildName : 'Unknown';
									const guildId = typeof entry.guildId === 'string' ? entry.guildId : 'Unknown';
									const roles = Array.isArray(entry.roles) ? entry.roles : [];
									const icon = type === 'owner' ? '👑' : type === 'staff' ? '🛡️' : '👤';
									const typeName = type.charAt(0).toUpperCase() + type.slice(1);
									const rolesText = roles.length > 0 ? `\n> **Roles:** ${roles.join(', ')}` : '';
									return `${icon} **${typeName}** at **${guildName}** (\`${guildId}\`)` + rolesText;
								})
								.join('\n');

							return new EmbedBuilder()
								.setTitle(
									await t(interaction.guild!.id, 'commands.utility.wd.user.foundAtEmbed.title', {
										user_name: user.username,
										pageNumber: `${page + 1}/${chunks.length}`,
									}),
								)
								.setDescription(entries)
								.setColor(client.config.colors.error)
								.setTimestamp();
						};

						const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId('prev')
								.setLabel(await t(interaction.guild!.id, 'commands.utility.wd.user.buttons.prev'))
								.setStyle(ButtonStyle.Primary)
								.setDisabled(currentPage === 0),
							new ButtonBuilder()
								.setCustomId('next')
								.setLabel(await t(interaction.guild!.id, 'commands.utility.wd.user.buttons.next'))
								.setStyle(ButtonStyle.Primary)
								.setDisabled(currentPage === chunks.length - 1),
						);

						const message = await interaction.editReply({
							embeds: [infoEmbed, await getPageEmbed(currentPage)],
							components: [row],
						});

						const collector = message.createMessageComponentCollector({
							filter: (i: MessageComponentInteraction) => i.user.id === interaction.user.id && i.isButton(),
							time: 60000,
						});

						collector.on('collect', async (i) => {
							if (!i.isButton()) return;

							if (i.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
							if (i.customId === 'next') currentPage = Math.min(chunks.length - 1, currentPage + 1);

							await i.update({
								embeds: [infoEmbed, await getPageEmbed(currentPage)],
								components: [
									new ActionRowBuilder<ButtonBuilder>().addComponents(
										new ButtonBuilder()
											.setCustomId('prev')
											.setLabel(await t(interaction.guild!.id, 'commands.utility.wd.user.buttons.prev'))
											.setStyle(ButtonStyle.Primary)
											.setDisabled(currentPage === 0),
										new ButtonBuilder()
											.setCustomId('next')
											.setLabel(await t(interaction.guild!.id, 'commands.utility.wd.user.buttons.next'))
											.setStyle(ButtonStyle.Primary)
											.setDisabled(currentPage === chunks.length - 1),
									),
								],
							});
						});

						collector.on('end', async () => {
							await interaction.editReply({
								components: [],
							});
						});
						break;
					}

					case 'guild': {
						const guildId = (interaction.options.getString('guildid') ?? interaction.guildId)!;
						if (!guildId) {
							return interaction.editReply({
								content: await t(interaction.guild!.id, 'commands.utility.wd.guild.noData', { guild_id: guildId }),
							});
						}

						const guildData = await client.prisma.guilds.findUnique({ where: { guildId } });
						if (!guildData) {
							return interaction.editReply({
								content: await t(interaction.guild!.id, 'commands.utility.wd.guild.noData', { guild_id: guildId }),
							});
						}

						const embed = new EmbedBuilder()
							.setTitle(
								await t(interaction.guild!.id, 'commands.utility.wd.guild.embed.title', {
									guild_name: guildData.name ?? guildId,
								}),
							)
							.setColor(
								guildData.status === GuildStatus.BLACKLISTED
									? client.config.colors.error
									: client.config.colors.warning,
							)
							.setDescription(
								[
									`${await t(interaction.guild!.id, 'commands.utility.wd.guild.embed._1._1')} ${guildData.status ?? (await t(interaction.guild!.id, 'commands.utility.wd.guild.embed._1._2'))}`,
									`${await t(interaction.guild!.id, 'commands.utility.wd.guild.embed._2._1')} ${guildData.type ?? (await t(interaction.guild!.id, 'commands.utility.wd.guild.embed._2._2'))}`,
									`${await t(interaction.guild!.id, 'commands.utility.wd.guild.embed._3._1')} ${guildData.reason ?? (await t(interaction.guild!.id, 'commands.utility.wd.guild.embed._3._2'))}`,
								].join('\n'),
							)
							.setTimestamp();

						return interaction.editReply({ embeds: [embed] });
					}
				}
				break;

			case null:
				switch (subcommand) {
					case 'stats': {
						const guildsWithWatchDogEnabled = await client.prisma.watchdogConfig.findMany({ where: { enabled: true } });
						const totalUsers = await client.prisma.users.count();
						const autoBlockedUsers = await client.prisma.users.count({
							where: { status: WatchdogStatus.AUTO_BLOCKED },
						});
						const blockedUsers = await client.prisma.users.count({ where: { status: WatchdogStatus.BLOCKED } });
						const permBlockedUsers = await client.prisma.users.count({
							where: { status: WatchdogStatus.PERM_BLOCKED },
						});
						const appealedUsers = await client.prisma.users.count({ where: { status: WatchdogStatus.APPEALED } });
						const totalGuilds = await client.prisma.guilds.count();
						const blacklistedGuilds = await client.prisma.guilds.count({ where: { status: GuildStatus.BLACKLISTED } });

						const embed = new EmbedBuilder()
							.setTitle(await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.title'))
							.setColor(client.config.colors.primary)
							.setDescription(
								[
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.users'),
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.total', { totalUsers }),
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.autoBlocked', { autoBlockedUsers }),
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.blocked', { blockedUsers }),
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.permBlocked', { permBlockedUsers }),
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.appealed', { appealedUsers }),
									'',
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.guilds'),
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.totalGuilds', { totalGuilds }),
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.blacklistedGuilds', {
										blacklistedGuilds,
									}),
									await t(interaction.guild!.id, 'commands.utility.wd.stats.embed.watchdogEnabled', {
										watchdogEnabled: guildsWithWatchDogEnabled.length,
									}),
								].join('\n'),
							)
							.setTimestamp();

						return interaction.editReply({ embeds: [embed] });
					}
				}
				break;

			default:
				return interaction.editReply({ content: 'Unknown subcommand.' });
		}
	},
};

export default command;
