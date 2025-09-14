import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
} from 'discord.js';
import { Prisma } from '@prisma/client';
import { logger, actionUser, hasRoles } from '../../../components/exports.js';

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += chunkSize) {
		chunks.push(arr.slice(i, i + chunkSize));
	}
	return chunks;
}

const command: CommandInterface = {
	cooldown: 2,
	isDeveloperOnly: true,
	data: new SlashCommandBuilder()
		.setName('block')
		.setDescription('Manage blocked users')
		.setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Block a user')
				.addUserOption((opt) => opt.setName('user').setDescription('The user to block').setRequired(true))
				.addStringOption((opt) =>
					opt
						.setName('status')
						.setDescription('Block type')
						.setRequired(true)
						.addChoices({ name: 'Blocked', value: 'BLOCKED' }, { name: 'Permanent Block', value: 'PERM_BLOCKED' }),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('Reason for block'))
				.addStringOption((opt) => opt.setName('evidence').setDescription('Evidence (link, JSON, etc.)')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('add-multiple')
				.setDescription('Block multiple users at once')
				.addStringOption((opt) =>
					opt.setName('users').setDescription('Comma-separated list of user IDs or mentions').setRequired(true),
				)
				.addStringOption((opt) =>
					opt
						.setName('status')
						.setDescription('Block type')
						.setRequired(true)
						.addChoices({ name: 'Blocked', value: 'BLOCKED' }, { name: 'Permanent Block', value: 'PERM_BLOCKED' }),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('Reason for block'))
				.addStringOption((opt) => opt.setName('evidence').setDescription('Evidence (link, JSON, etc.)')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('update')
				.setDescription('Update a blocked user')
				.addUserOption((opt) => opt.setName('user').setDescription('The blocked user').setRequired(true))
				.addStringOption((opt) =>
					opt
						.setName('status')
						.setDescription('New block status')
						.setRequired(false)
						.addChoices(
							{ name: 'Blocked', value: 'BLOCKED' },
							{ name: 'Permanent Blocked', value: 'PERM_BLOCKED' },
							{ name: 'Auto Blocked', value: 'AUTO_BLOCKED' },
						),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('New reason'))
				.addStringOption((opt) => opt.setName('evidence').setDescription('New evidence')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Unblock a user')
				.addUserOption((opt) => opt.setName('user').setDescription('The blocked user').setRequired(true)),
		)
		// .addSubcommand((sub) =>
		// 	sub
		// 		.setName('info')
		// 		.setDescription('Get info about a blocked user')
		// 		.addUserOption((opt) => opt.setName('user').setDescription('The blocked user').setRequired(true)),
		// )
		.addSubcommand((sub) =>
			sub
				.setName('scan')
				.setDescription('Scan the server for blocked users and apply actions')
				.addStringOption((opt) => opt.setName('guild').setDescription('The guild id to scan').setRequired(true)),
		),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const subcommandGroup = interaction.options.getSubcommandGroup(false);
		const subcommand = interaction.options.getSubcommand();

		const ROLE_REQUIREMENTS: Record<string, string[]> = {
			add: process.env.STAFF_ROLE_REQUIREMENTS_ADD!.split(','),
			'add-multiple': process.env.STAFF_ROLE_REQUIREMENTS_ADD_MULTIPLE!.split(','),
			update: process.env.STAFF_ROLE_REQUIREMENTS_UPDATE!.split(','),
			remove: process.env.STAFF_ROLE_REQUIREMENTS_REMOVE!.split(','),
			info: process.env.STAFF_ROLE_REQUIREMENTS_INFO?.split(',') ?? [],
			scan: process.env.STAFF_ROLE_REQUIREMENTS_SCAN!.split(','),
		};

		const requiredRoles = ROLE_REQUIREMENTS[subcommand];
		if (requiredRoles.length > 0) {
			const guildId = client.config.guilds[0].id;
			const userId = interaction.user.id;

			if (!(await hasRoles(client, guildId, userId, requiredRoles))) {
				return interaction.reply({
					content: `\`❌\` You need one of these roles to use \`${subcommand}\`: ${requiredRoles.map((r) => `<@&${r}>`).join(', ')}`,
					ephemeral: true,
				});
			}
		}

		const user = interaction.options.getUser('user')!;
		const reason = interaction.options.getString('reason') ?? 'No reason provided';
		const status = interaction.options.getString('status') as any;
		const evidence = interaction.options.getString('evidence') ?? null;
		const guildId = interaction.options.getString('guild') ?? interaction.guild!.id;

		switch (subcommand) {
			case 'add': {
				if (!user) return interaction.reply({ content: '`⚠️` No user specified.', flags: ['Ephemeral'] });

				const existing = await client.prisma.users.findUnique({ where: { userId: user.id } });
				if (existing)
					return interaction.reply({ content: `\`⚠️\` ${user.tag} is already blocked.`, flags: ['Ephemeral'] });

				await client.prisma.users.create({
					data: {
						userId: user.id,
						last_username: user.username,
						last_avatar: user.displayAvatarURL(),
						status,
						reason,
						evidence: evidence ? ({ text: evidence } as Prisma.InputJsonValue) : Prisma.JsonNull,
					},
				});

				return interaction.reply({
					content: `\`✅\` ${user.tag} has been blocked as **${status}**.`,
					flags: ['Ephemeral'],
				});
			}

			case 'add-multiple': {
				const usersInput = interaction.options.getString('users', true);
				const status = interaction.options.getString('status', true) as any;
				const reason = interaction.options.getString('reason') ?? 'No reason provided';
				const evidence = interaction.options.getString('evidence') ?? null;

				const userIds = usersInput
					.split(',')
					.map((u) => u.trim().replace(/<@!?(\d+)>/, '$1'))
					.filter(Boolean);

				let blockedCount = 0;
				let alreadyBlocked: string[] = [];

				for (const id of userIds) {
					const existing = await client.prisma.users.findUnique({ where: { userId: id } });
					if (existing) {
						alreadyBlocked.push(id);
						continue;
					}

					const fetchedUser = await client.users.fetch(id);
					await client.prisma.users.create({
						data: {
							userId: id,
							last_username: fetchedUser.username,
							last_avatar: fetchedUser.displayAvatarURL(),
							status,
							reason,
							evidence: evidence ? ({ text: evidence } as Prisma.InputJsonValue) : Prisma.JsonNull,
						},
					});
					blockedCount++;
				}

				return interaction.reply({
					content: [
						`\`✅\` Blocked **${blockedCount}** users as ${status}.`,
						alreadyBlocked.length ? `\`⚠️\` Skipped already blocked users: ${alreadyBlocked.join(', ')}` : '',
					].join('\n'),
					flags: ['Ephemeral'],
				});
			}

			case 'update': {
				if (!user) return interaction.reply({ content: '`⚠️` No user specified.', flags: ['Ephemeral'] });

				const existing = await client.prisma.users.findUnique({ where: { userId: user.id } });
				if (!existing)
					return interaction.reply({ content: `\`⚠️\` ${user.tag} is not blocked.`, flags: ['Ephemeral'] });

				await client.prisma.users.update({
					where: { userId: user.id },
					data: {
						status: status ?? existing.status,
						reason: reason ?? existing.reason,
						evidence: evidence
							? ({ text: evidence } as Prisma.InputJsonValue)
							: (existing.evidence as Prisma.InputJsonValue),
						last_username: user.username,
						last_avatar: user.displayAvatarURL(),
					},
				});

				return interaction.reply({ content: `\`✏️\` Updated blocked user **${user.tag}**.`, flags: ['Ephemeral'] });
			}

			case 'remove': {
				if (!user) return interaction.reply({ content: '`⚠️` No user specified.', flags: ['Ephemeral'] });

				const existing = await client.prisma.users.findUnique({ where: { userId: user.id } });
				if (!existing)
					return interaction.reply({ content: `\`⚠️\` ${user.tag} is not blocked.`, flags: ['Ephemeral'] });

				await client.prisma.users.delete({
					where: { userId: user.id },
				});
				return interaction.reply({ content: `\`🗑️\` ${user.tag} has been unblocked.`, flags: ['Ephemeral'] });
			}

			case 'info': {
				if (!user) return interaction.reply({ content: '`⚠️` No user specified.', flags: ['Ephemeral'] });

				const existing = await client.prisma.users.findUnique({ where: { userId: user.id } });
				if (!existing)
					return interaction.reply({ content: `\`⚠️\` ${user.tag} is not blocked.`, flags: ['Ephemeral'] });

				const embed = new EmbedBuilder()
					.setTitle(`🚩 Block Info: ${user.tag}`)
					.addFields(
						{ name: 'Status', value: existing.status, inline: true },
						{ name: 'Reason', value: existing.reason ?? 'None', inline: true },
					)
					.setFooter({ text: `User ID: ${existing.userId}` })
					.setTimestamp();

				return interaction.reply({ embeds: [embed], flags: ['Ephemeral'] });
			}

			case 'scan': {
				let guild;
				try {
					guild = await client.guilds.fetch(guildId);
				} catch {
					return interaction.reply({
						content: `\`❌\` Guild with ID \`${guildId}\` could not be found.`,
						flags: ['Ephemeral'],
					});
				}

				const watchdogConfig = await client.prisma.watchdogConfig.findUnique({ where: { guildId: guild.id } });
				if (!watchdogConfig || !watchdogConfig.enabled) {
					return interaction.reply({
						content: '`⚠️` Watchdog system is disabled for this guild.',
						flags: ['Ephemeral'],
					});
				}

				await interaction.deferReply({ flags: ['Ephemeral'] });

				const members = await guild.members.fetch();
				const affected: { member: any; dbUser: any; action: string }[] = [];

				for (const [, member] of members) {
					if (member.user.bot) continue;
					const dbUser = await client.prisma.users.findUnique({ where: { userId: member.id } });
					if (!dbUser) continue;

					const action =
						dbUser.status === 'PERM_BLOCKED'
							? watchdogConfig.actionOnPermBlocked
							: dbUser.status === 'AUTO_BLOCKED'
								? watchdogConfig.actionOnAutoBlocked
								: watchdogConfig.actionOnBlocked;

					affected.push({ member, dbUser, action });
				}

				if (!affected.length) {
					return interaction.editReply({ content: '`✅` No blocked users found in this guild.' });
				}

				// --- Pagination setup ---
				const chunks = chunkArray(affected, 10);
				let page = 0;

				const buildEmbed = () => {
					const list = chunks[page]
						.map((a) => `• ${a.member.user.tag} (\`${a.member.id}\`) → **${a.dbUser.status}** → Action: *${a.action}*`)
						.join('\n');

					return new EmbedBuilder()
						.setTitle(`🚨 Scan Preview for ${guild.name}`)
						.setDescription(`${affected.length} member(s) will be affected.\n\n${list}`)
						.setFooter({ text: `Page ${page + 1} / ${chunks.length}` })
						.setColor('Red')
						.setTimestamp();
				};

				const buildRow = () =>
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId('scan_prev')
							.setEmoji('⬅️')
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(page === 0),
						new ButtonBuilder()
							.setCustomId('scan_next')
							.setEmoji('➡️')
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(page === chunks.length - 1),
						new ButtonBuilder().setCustomId('scan_confirm').setLabel('✅ Approve').setStyle(ButtonStyle.Success),
						new ButtonBuilder().setCustomId('scan_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger),
					);

				await interaction.editReply({ embeds: [buildEmbed()], components: [buildRow()] });

				// Collector
				const msg = await interaction.fetchReply();
				const collector = msg.createMessageComponentCollector({ time: 300_000 });

				collector.on('collect', async (i) => {
					if (i.user.id !== interaction.user.id) {
						return i.reply({ content: 'You are not authorized to respond to this.', ephemeral: true });
					}

					if (i.customId === 'scan_prev') {
						page--;
						await i.update({ embeds: [buildEmbed()], components: [buildRow()] });
					} else if (i.customId === 'scan_next') {
						page++;
						await i.update({ embeds: [buildEmbed()], components: [buildRow()] });
					} else if (i.customId === 'scan_confirm') {
						let success = 0;
						for (const a of affected) {
							try {
								await actionUser(a.member, client, a.action, a.dbUser, watchdogConfig);
								success++;
							} catch (err) {
								logger.warn(`Failed to apply action on ${a.member.id}: ${err}`);
							}
						}
						collector.stop();
						await i.update({
							content: `\`✅\` Scan complete. Applied actions to **${success}** member(s).`,
							embeds: [],
							components: [],
						});
					} else if (i.customId === 'scan_cancel') {
						collector.stop();
						await i.update({ content: '`❌` Scan canceled.', embeds: [], components: [] });
					}
				});

				collector.on('end', async (_, reason) => {
					if (reason === 'time') {
						await interaction.editReply({
							content: '`⌛` Scan expired without approval.',
							embeds: [],
							components: [],
						});
					}
				});
				break;
			}
		}
	},
};

export default command;
