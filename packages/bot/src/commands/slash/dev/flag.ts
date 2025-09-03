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
	TextChannel,
} from 'discord.js';
import { Prisma } from '@prisma/client';
import { logger, actionUser } from '../../../components/exports.js';

const command: CommandInterface = {
	cooldown: 2,
	isDeveloperOnly: true,
	data: new SlashCommandBuilder()
		.setName('flag')
		.setDescription('Manage flagged users')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Flag a user')
				.addUserOption((opt) => opt.setName('user').setDescription('The user to flag').setRequired(true))
				.addStringOption((opt) =>
					opt
						.setName('status')
						.setDescription('Flag type')
						.setRequired(true)
						.addChoices({ name: 'Flagged', value: 'FLAGGED' }, { name: 'Permanent Flag', value: 'PERM_FLAGGED' }),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('Reason for flagging'))
				.addStringOption((opt) => opt.setName('evidence').setDescription('Evidence (link, JSON, etc.)')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('add-multiple')
				.setDescription('Flag multiple users at once')
				.addStringOption((opt) =>
					opt.setName('users').setDescription('Comma-separated list of user IDs or mentions').setRequired(true),
				)
				.addStringOption((opt) =>
					opt
						.setName('status')
						.setDescription('Flag type')
						.setRequired(true)
						.addChoices({ name: 'Flagged', value: 'FLAGGED' }, { name: 'Permanent Flag', value: 'PERM_FLAGGED' }),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('Reason for flagging'))
				.addStringOption((opt) => opt.setName('evidence').setDescription('Evidence (link, JSON, etc.)')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('update')
				.setDescription('Update a flagged user')
				.addUserOption((opt) => opt.setName('user').setDescription('The flagged user').setRequired(true))
				.addStringOption((opt) =>
					opt
						.setName('status')
						.setDescription('New flag status')
						.setRequired(false)
						.addChoices(
							{ name: 'Flagged', value: 'FLAGGED' },
							{ name: 'Permanent Flag', value: 'PERM_FLAGGED' },
							{ name: 'Auto Flag', value: 'AUTO_FLAGGED' },
						),
				)
				.addStringOption((opt) => opt.setName('reason').setDescription('New reason'))
				.addStringOption((opt) => opt.setName('evidence').setDescription('New evidence')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Unflag a user')
				.addUserOption((opt) => opt.setName('user').setDescription('The flagged user').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('info')
				.setDescription('Get info about a flagged user')
				.addUserOption((opt) => opt.setName('user').setDescription('The flagged user').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('scan')
				.setDescription('Scan the server for flagged users and apply actions')
				.addStringOption((opt) => opt.setName('guild').setDescription('The guild id to scan').setRequired(true)),
		)
		.addSubcommandGroup((group) =>
			group
				.setName('appeal')
				.setDescription('Manage user appeals')
				.addSubcommand((sub) => sub.setName('setup').setDescription('Setup the appeal system'))
				.addSubcommand((sub) =>
					sub
						.setName('manage')
						.setDescription('Manage a user appeal (Approve or Deny)')
						.addUserOption((opt) =>
							opt.setName('user').setDescription('The user who submitted the appeal').setRequired(true),
						)
						.addStringOption((opt) =>
							opt
								.setName('action')
								.setDescription('What to do with the appeal')
								.setRequired(true)
								.addChoices({ name: 'Approve', value: 'APPROVE' }, { name: 'Deny', value: 'DENY' }),
						)
						.addStringOption((opt) =>
							opt.setName('reason').setDescription('Reason for approval/denial').setRequired(true),
						),
				),
		),

	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const subcommandGroup = interaction.options.getSubcommandGroup(false);
		const subcommand = interaction.options.getSubcommand();

		const user = interaction.options.getUser('user')!;
		const reason = interaction.options.getString('reason') ?? "No reason provided";
		const status = interaction.options.getString('status') as any;
		const evidence = interaction.options.getString('evidence') ?? null;
		const guildId = interaction.options.getString('guild') ?? interaction.guild!.id;

		if (subcommandGroup === 'appeal') {
			switch (subcommand) {
				case 'setup': {
					const embed = new EmbedBuilder()
						.setTitle('🚨 Flagged User Appeal')
						.setColor(client.config.colors.primary)
						.setAuthor({ name: 'Watchdog System', iconURL: interaction.guild?.iconURL() ?? undefined })
						.setDescription(
							[
								'If you have been flagged by our system, you may request a review by submitting an appeal.',
								'',
								'`⚠️` **Important Rules:**',
								'- You may only have **one active appeal** at a time.',
								'- Make sure to provide all relevant details so staff can review your case properly.',
								'- Appeals are reviewed by our moderation team and may take some time.',
							].join('\n'),
						)
						.addFields(
							{
								name: 'Next Steps',
								value: [
									'`1️⃣` Click the **Submit Appeal** button below.',
									'`2️⃣` Fill out the form with your explanation.',
									'`3️⃣` Wait for staff to review your appeal.',
								].join('\n'),
							},
							{
								name: 'Tips for a Successful Appeal',
								value: [
									'`•` Be clear and honest',
									'`•` Provide context or evidence if available',
									'`•` Avoid spamming or multiple submissions',
								].join('\n'),
							},
						)
						.setFooter({ text: 'This is an automated system message. Please do not reply here directly.' })
						.setTimestamp();

					const button = new ButtonBuilder()
						.setCustomId('startAppeal')
						.setLabel('📨 Submit Appeal')
						.setStyle(ButtonStyle.Secondary);

					const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
					const channel = interaction.channel as TextChannel;
					await channel.send({ embeds: [embed], components: [row] });

					return interaction.reply({ content: '`✅` Appeal setup message sent successfully!', ephemeral: true });
				}

				case 'manage': {
					if (!user) return interaction.reply({ content: '`⚠️` No user specified.', ephemeral: true });

					const action = interaction.options.getString('action', true) as 'APPROVE' | 'DENY';
					const modReason = reason ?? '';

					const appeal = await client.prisma.appeal.findFirst({
						where: { userId: user.id, status: 'PENDING' },
					});
					if (!appeal)
						return interaction.reply({ content: `\`⚠️\` No pending appeal found for ${user.tag}.`, ephemeral: true });

					await client.prisma.appeal.update({
						where: { id: appeal.id },
						data: {
							status: action === 'APPROVE' ? 'APPROVED' : 'DENIED',
							moderatorResponse: modReason,
							moderator: interaction.user.id,
						},
					});

					if (action === 'APPROVE') {
						await client.prisma.users.update({
							where: { userId: user.id },
							data: { status: 'APPEALED' },
						});
					}

					const appealEmbed = new EmbedBuilder()
						.setTitle(`📣 Your appeal has been ${action === 'APPROVE' ? 'approved' : 'denied'}`)
						.setColor(action === 'APPROVE' ? client.config.colors.success : client.config.colors.error)
						.setDescription(modReason ? `**Reason:** ${modReason}` : '')
						.setFooter({ text: 'This is an automated system message. Please do not reply here directly.' })
						.setTimestamp();

					user.send({ embeds: [appealEmbed] }).catch(() => {});

					return interaction.reply({
						content: `\`✅\` Appeal for ${user.tag} has been ${action === 'APPROVE' ? 'approved' : 'denied'}.`,
						ephemeral: true,
					});
				}
			}
		} else {
			switch (subcommand) {
				case 'add': {
					if (!user) return interaction.reply({ content: '`⚠️` No user specified.', flags: ['Ephemeral'] });

					const existing = await client.prisma.users.findUnique({ where: { userId: user.id } });
					if (existing)
						return interaction.reply({ content: `\`⚠️\` ${user.tag} is already flagged.`, flags: ['Ephemeral'] });

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
						content: `\`✅\` ${user.tag} has been flagged as **${status}**.`,
						flags: ['Ephemeral'],
					});
				}

				case 'add-multiple': {
					const usersInput = interaction.options.getString('users', true);
					const status = interaction.options.getString('status', true) as any;
					const reason = interaction.options.getString('reason') ?? "No reason provided";
					const evidence = interaction.options.getString('evidence') ?? null;

					const userIds = usersInput
						.split(',')
						.map((u) => u.trim().replace(/<@!?(\d+)>/, '$1'))
						.filter(Boolean);

					let flaggedCount = 0;
					let alreadyFlagged: string[] = [];

					for (const id of userIds) {
						const existing = await client.prisma.users.findUnique({ where: { userId: id } });
						if (existing) {
							alreadyFlagged.push(id);
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
						flaggedCount++;
					}

					return interaction.reply({
						content: [
							`\`✅\` Flagged **${flaggedCount}** users as ${status}.`,
							alreadyFlagged.length ? `\`⚠️\` Skipped already flagged users: ${alreadyFlagged.join(', ')}` : '',
						].join('\n'),
						flags: ['Ephemeral'],
					});
				}

				case 'update': {
					if (!user) return interaction.reply({ content: '`⚠️` No user specified.', flags: ['Ephemeral'] });

					const existing = await client.prisma.users.findUnique({ where: { userId: user.id } });
					if (!existing)
						return interaction.reply({ content: `\`⚠️\` ${user.tag} is not flagged.`, flags: ['Ephemeral'] });

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

					return interaction.reply({ content: `\`✏️\` Updated flagged user **${user.tag}**.`, flags: ['Ephemeral'] });
				}

				case 'remove': {
					if (!user) return interaction.reply({ content: '`⚠️` No user specified.', flags: ['Ephemeral'] });

					const existing = await client.prisma.users.findUnique({ where: { userId: user.id } });
					if (!existing)
						return interaction.reply({ content: `\`⚠️\` ${user.tag} is not flagged.`, flags: ['Ephemeral'] });

					await client.prisma.appeal.deleteMany({
						where: { userId: user.id },
					});

					await client.prisma.users.delete({
						where: { userId: user.id },
					});
					return interaction.reply({ content: `\`🗑️\` ${user.tag} has been unflagged.`, flags: ['Ephemeral'] });
				}

				case 'info': {
					if (!user) return interaction.reply({ content: '`⚠️` No user specified.', flags: ['Ephemeral'] });

					const existing = await client.prisma.users.findUnique({ where: { userId: user.id } });
					if (!existing)
						return interaction.reply({ content: `\`⚠️\` ${user.tag} is not flagged.`, flags: ['Ephemeral'] });

					const embed = new EmbedBuilder()
						.setTitle(`🚩 Flag Info: ${user.tag}`)
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

					const flaggedSettings = await client.prisma.watchdogConfig.findUnique({ where: { guildId: guild.id } });
					if (!flaggedSettings || !flaggedSettings.enabled)
						return interaction.reply({
							content: '`⚠️` Flagged system is disabled for this guild.',
							flags: ['Ephemeral'],
						});

					const members = await guild.members.fetch();
					let affected = 0;

					for (const [, member] of members) {
						try {
							if (member.user.bot) continue;

							const dbUser = await client.prisma.users.findUnique({ where: { userId: member.id } });
							if (!dbUser) continue;

							const action =
								dbUser.status === 'PERM_FLAGGED'
									? flaggedSettings.actionOnPerm
									: dbUser.status === 'AUTO_FLAGGED'
										? flaggedSettings.actionOnAuto
										: flaggedSettings.actionOnFlag;

							await actionUser(member, client, action, dbUser, flaggedSettings);
							affected++;
						} catch (err) {
							logger.warn(`Failed to apply action on ${member.id}: ${err}`);
						}
					}

					return interaction.reply({
						content: `\`✅\` Scan complete. Applied actions to **${affected}** flagged member(s).`,
						flags: ['Ephemeral'],
					});
				}
			}
		}
	},
};

export default command;
