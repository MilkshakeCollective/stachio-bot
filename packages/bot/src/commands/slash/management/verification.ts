import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
	Role,
	SlashCommandBuilder,
	TextChannel,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
} from 'discord.js';
import { emojiCategories } from '../../../config/emojiCategories.js';

function buildCaptchaRow(emojis: string[]) {
	const buttons = emojis
		.slice(0, 3)
		.map((e, idx) => new ButtonBuilder().setCustomId(`verify:pick:${e}`).setLabel(e).setStyle(ButtonStyle.Secondary));
	return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

function shuffle<T>(arr: T[]): T[] {
	return [...arr].sort(() => Math.random() - 0.5);
}

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('verification')
		.setDescription('Manage and setup the verification system (Online Safety 2.0)')
		.setNSFW(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) =>
			sub
				.setName('setup')
				.setDescription('Set up (or re-render) the verification message in a channel')
				.addChannelOption((opt) =>
					opt.setName('log_channel').setDescription('Verification log channel').setRequired(true),
				)
				.addChannelOption((opt) =>
					opt.setName('channel').setDescription('Verification message channel').setRequired(true),
				)
				.addRoleOption((opt) => opt.setName('role').setDescription('Role given when verified').setRequired(true))
				.addBooleanOption((opt) =>
					opt.setName('kick_on_fail').setDescription('Kick a user when failed').setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('set-emoji-style')
				.setDescription('Set the emoji style for your verification message')
				.addStringOption((opt) =>
					opt
						.setName('style')
						.setDescription('Choose an emoji style')
						.setRequired(true)
						.addChoices(
							{ name: 'Colors', value: 'colors' },
							{ name: 'Symbols', value: 'symbols' },
							{ name: 'Animals', value: 'animals' },
						),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('log')
				.setDescription('View or change the log channel')
				.addChannelOption((opt) => opt.setName('channel').setDescription('New log channel')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('roles')
				.setDescription('View, add or remove verification roles')
				.addRoleOption((opt) => opt.setName('role').setDescription('Role to add or remove'))
				.addStringOption((opt) =>
					opt
						.setName('action')
						.setDescription('Add or remove the role')
						.addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('kick-on-fail')
				.setDescription('Enable or disable kicking users after max verification failures')
				.addBooleanOption((opt) =>
					opt.setName('enabled').setDescription('Enable or disable auto kick').setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('limits')
				.setDescription('Set timeout (seconds) and max attempts')
				.addIntegerOption((opt) =>
					opt.setName('timeout_seconds').setDescription('Timeout before reset (default 43200)'),
				)
				.addIntegerOption((opt) => opt.setName('max_attempts').setDescription('Max wrong attempts (default 3)')),
		)
		.addSubcommand((sub) =>
			sub
				.setName('regenerate')
				.setDescription('Regenerate a fresh set of emojis & correct answer and update the message'),
		)
		.addSubcommand((sub) =>
			sub
				.setName('clear-attempts')
				.setDescription("Clear a user's verification attempts so they can retry")
				.addUserOption((opt) =>
					opt.setName('user').setDescription('User whose attempts you want to clear').setRequired(true),
				),
		)
		.addSubcommand((sub) => sub.setName('toggle').setDescription('toggle the verification system in this server')),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const { options, guild } = interaction;
		const sub = options.getSubcommand();
		const existing = await client.prisma.verificationConfig.findUnique({ where: { guildId: guild!.id } });
		switch (sub) {
			case 'setup': {
				const log_channel = options.getChannel('log_channel') as TextChannel;
				const channel = options.getChannel('channel') as TextChannel;
				const role = options.getRole('role') as Role;
				const kickOnFail = options.getBoolean('kick_on_fail') as boolean;

				const styleCategory = existing?.emojiCategory ?? 'colors';
				const pool = emojiCategories[styleCategory] ?? emojiCategories.colors;
				const shuffled = shuffle(pool).slice(0, 3);
				const correctEmoji = shuffled[Math.floor(Math.random() * shuffled.length)];

				const embed = new EmbedBuilder()
					.setTitle('🔐 Server Verification')
					.setDescription(
						[
							"Welcome! Before you can access the server, we need to make sure you're not a bot.",
							'',
							'`✅` **How to verify:**',
							`Press the **correct emoji button** below that matches this one: \`${correctEmoji}\`.`,
							'',
							'`⚠️` You only get a few chances — choose carefully!',
						].join('\n'),
					)
					.setColor('Blurple')
					.setFooter({ text: 'Verification System • Stay safe online' })
					.setTimestamp();

				const row = buildCaptchaRow(shuffled);
				const message = await channel.send({ embeds: [embed], components: [row] });

				await client.prisma.verificationConfig.upsert({
					where: { guildId: guild!.id },
					update: {
						enabled: true,
						kickOnFail,
						logsChannelId: log_channel.id,
						channelId: channel.id,
						verifiedRoleIds: [role.id],
						messageId: message.id,
						correctEmoji,
						emojis: shuffled,
					},
					create: {
						guildId: guild!.id,
						enabled: true,
						kickOnFail,
						logsChannelId: log_channel.id,
						channelId: channel.id,
						verifiedRoleIds: [role.id],
						messageId: message.id,
						correctEmoji,
						emojis: shuffled,
						emojiCategory: styleCategory,
					},
				});

				return interaction.reply({ content: '`✅` Verification message is live with buttons.', flags: ['Ephemeral'] });
			}

			case 'set-emoji-style': {
				const style = options.getString('style', true);
				if (existing) {
					await client.prisma.verificationConfig.update({
						where: { guildId: guild!.id },
						data: { emojiCategory: style },
					});
				} else {
					await client.prisma.verificationConfig.create({
						data: {
							guildId: guild!.id,
							kickOnFail: true,
							logsChannelId: '',
							channelId: '',
							verifiedRoleIds: [],
							correctEmoji: '',
							emojis: [],
							emojiCategory: style,
						},
					});
				}
				return interaction.reply({ content: `\`✅\` Emoji style set to **\`${style}\`**.`, flags: ['Ephemeral'] });
			}

			case 'log': {
				if (!existing)
					return interaction.reply({
						content: '`⚠️` No verification config found. Run `/verification setup` first.',
						flags: ['Ephemeral'],
					});
				const newChannel = options.getChannel('channel') as TextChannel;
				if (!newChannel)
					return interaction.reply({
						content: `Current log channel: <#${existing.logsChannelId}>`,
						flags: ['Ephemeral'],
					});
				await client.prisma.verificationConfig.update({
					where: { guildId: guild!.id },
					data: { logsChannelId: newChannel.id },
				});
				return interaction.reply({
					content: `\`✅\` Log channel updated to <#${newChannel.id}>.`,
					flags: ['Ephemeral'],
				});
			}

			case 'roles': {
				if (!existing)
					return interaction.reply({
						content: '`⚠️` No verification config found. Run `/verification setup` first.',
						flags: ['Ephemeral'],
					});
				const role = options.getRole('role') as Role | null;
				const action = options.getString('action') as 'add' | 'remove' | null;
				const roleIds: string[] = Array.isArray(existing.verifiedRoleIds) ? (existing.verifiedRoleIds as string[]) : [];
				if (!role || !action) {
					const current = roleIds.length ? roleIds.map((id) => `<@&${id}>`).join(', ') : 'None';
					return interaction.reply({ content: `Current verification roles: ${current}`, flags: ['Ephemeral'] });
				}
				const set = new Set(roleIds);
				if (action === 'add') set.add(role.id);
				if (action === 'remove') set.delete(role.id);
				await client.prisma.verificationConfig.update({
					where: { guildId: guild!.id },
					data: { verifiedRoleIds: Array.from(set) },
				});
				return interaction.reply({
					content: `\`✅\` Role <@&${role.id}> ${action === 'add' ? 'added to' : 'removed from'} verification roles.`,
					flags: ['Ephemeral'],
				});
			}

			case 'kick-on-fail': {
				if (!existing)
					return interaction.reply({
						content: '`⚠️` No verification config found. Run `/verification setup` first.',
						flags: ['Ephemeral'],
					});
				const enabled = options.getBoolean('enabled', true);
				await client.prisma.verificationConfig.update({
					where: { guildId: guild!.id },
					data: { kickOnFail: enabled },
				});
				return interaction.reply({
					content: `\`✅\` Auto kick on fail has been **${enabled ? 'enabled' : 'disabled'}**.`,
					flags: ['Ephemeral'],
				});
			}

			case 'limits': {
				if (!existing)
					return interaction.reply({
						content: '`⚠️` No verification config found. Run `/verification setup` first.',
						flags: ['Ephemeral'],
					});
				const timeout = options.getInteger('timeout_seconds');
				const maxAttempts = options.getInteger('max_attempts');
				if (timeout == null && maxAttempts == null)
					return interaction.reply({ content: 'Provide at least one option.', flags: ['Ephemeral'] });
				await client.prisma.verificationConfig.update({
					where: { guildId: guild!.id },
					data: {
						...(timeout != null ? { timeoutSeconds: Math.max(60, timeout) } : {}),
						...(maxAttempts != null ? { maxAttempts: Math.max(1, maxAttempts) } : {}),
					},
				});
				return interaction.reply({ content: '`✅` Limits updated.', flags: ['Ephemeral'] });
			}

			case 'regenerate': {
				if (!existing || !existing.channelId)
					return interaction.reply({
						content: '`⚠️` No verification message to update. Run `/verification setup` first.',
						flags: ['Ephemeral'],
					});
				const styleCategory = existing.emojiCategory ?? 'colors';
				const pool = emojiCategories[styleCategory] ?? emojiCategories.colors;
				const shuffled = shuffle(pool).slice(0, 3);
				const correctEmoji = shuffled[Math.floor(Math.random() * shuffled.length)];

				const channel = (await guild!.channels.fetch(existing.channelId).catch(() => null)) as TextChannel | null;
				const message =
					existing.messageId && channel ? await channel.messages.fetch(existing.messageId).catch(() => null) : null;
				const row = buildCaptchaRow(shuffled);
				if (message) await message.edit({ components: [row] });

				await client.prisma.verificationConfig.update({
					where: { guildId: guild!.id },
					data: { emojis: shuffled, correctEmoji },
				});
				return interaction.reply({ content: '`✅` Captcha regenerated.', flags: ['Ephemeral'] });
			}

			case 'clear-attempts': {
				if (!existing)
					return interaction.reply({
						content: '`⚠️` No verification config found. Run `/verification setup` first.',
						flags: ['Ephemeral'],
					});

				const target = options.getUser('user', true);

				await client.prisma.verificationAttempt.deleteMany({
					where: { guildId: guild!.id, userId: target.id },
				});

				return interaction.reply({
					content: `\`✅\` Cleared verification attempts for **${target.tag}** (${target.id}).`,
					flags: ['Ephemeral'],
				});
			}

			case 'toggle': {
				if (!existing) {
					return interaction.reply({
						content: '`⚠️` No verification config found. Run `/verification setup` first.',
						flags: ['Ephemeral'],
					});
				}

				const newState = !existing.enabled;

				if (newState) {
					await client.prisma.verificationConfig.update({
						where: { guildId: guild!.id },
						data: { enabled: true },
					});

					return interaction.reply({
						content: '`✅` Verification system has been **enabled**.',
						flags: ['Ephemeral'],
					});
				} else {
					if (existing.channelId && existing.messageId) {
						const channel = (await guild!.channels.fetch(existing.channelId).catch(() => null)) as TextChannel | null;
						if (channel) {
							const message = await channel.messages.fetch(existing.messageId).catch(() => null);
							if (message) await message.delete().catch(() => null);
						}
					}

					await client.prisma.verificationAttempt.deleteMany({
						where: { guildId: guild!.id, verificationConfigId: existing.id },
					});

					await client.prisma.verificationConfig.delete({
						where: { guildId: guild!.id },
					});

					return interaction.reply({
						content: '`✅` Verification system has been **disabled** and all configuration data was deleted.',
						flags: ['Ephemeral'],
					});
				}
			}
		}
	},
};

export default command;
