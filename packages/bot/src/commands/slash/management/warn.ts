import { addWarning, enforceSanctions } from '../../../components/exports.js';
import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: true,
	data: new SlashCommandBuilder()
		.setName('warnings')
		.setDescription('⚠️ Manage warnings system')
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add a warning to a user')
				.addUserOption((opt) => opt.setName('user').setDescription('User to warn').setRequired(true))
				.addStringOption((opt) => opt.setName('reason').setDescription('Reason for warning').setRequired(true))
				.addIntegerOption((opt) => opt.setName('points').setDescription('Points to add').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove warnings from a user')
				.addUserOption((opt) => opt.setName('user').setDescription('User to remove warnings from').setRequired(true))
				.addIntegerOption((opt) => opt.setName('points').setDescription('Points to remove').setRequired(false)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('view')
				.setDescription('View warnings for a user')
				.addUserOption((opt) => opt.setName('user').setDescription('User to view').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('config')
				.setDescription('Set a threshold for a specific action')
				.addStringOption((opt) =>
					opt
						.setName('action')
						.setDescription('The punishment action to configure')
						.setRequired(true)
						.addChoices(
							{ name: 'Mute', value: 'mute' },
							{ name: 'Kick', value: 'kick' },
							{ name: 'Ban', value: 'ban' },
						),
				)
				.addIntegerOption((opt) =>
					opt.setName('points').setDescription('Number of warning points required').setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('preset')
				.setDescription('Apply a preset warning config')
				.addStringOption((opt) =>
					opt
						.setName('type')
						.setDescription('Choose a preset')
						.setRequired(true)
						.addChoices(
							{ name: 'Lenient (mute=3, kick=6, ban=10)', value: 'lenient' },
							{ name: 'Strict (mute=2, kick=3, ban=5)', value: 'strict' },
							{ name: 'Hardcore (kick=2, ban=3)', value: 'hardcore' },
						),
				),
		),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const subcommand = interaction.options.getSubcommand();
		const user = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason');
		const points = interaction.options.getInteger('points');

		if (!user) return interaction.reply({ content: '`❌` User not found.', flags: ['Ephemeral'] });

		const member = await interaction.guild!.members.fetch(user.id);

		if (member.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({ content: '`❌` You cannot warn an administrator.', flags: ['Ephemeral'] });
		}

		switch (subcommand) {
			case 'add': {
				if (!reason || !points)
					return interaction.reply({ content: '`❌` Reason and points are required.', flags: ['Ephemeral'] });

				const { total, config } = await addWarning(
					client,
					interaction.guildId!,
					user.id,
					interaction.user.id,
					points,
					reason,
				);

				let replyMsg = `\`⚠️\` ${user.username} received ${points} points. Total: ${total}`;

				const thresholds = (config.thresholds as Record<string, number>) ?? {};
				if (total >= (thresholds.ban ?? Infinity)) replyMsg += ' - This user will be **banned**!';
				else if (total >= (thresholds.kick ?? Infinity)) replyMsg += ' - This user will be **kicked**!';
				else if (total >= (thresholds.mute ?? Infinity)) replyMsg += ' - This user will be **muted**!';

				await interaction.reply({ content: replyMsg, flags: ['Ephemeral'] });

				await enforceSanctions(member, total, config);
				break;
			}

			case 'remove': {
				const removePoints = points ?? 0;

				const warnings = await client.prisma.warnings.findMany({
					where: { userId: user.id, guildId: interaction.guildId! },
				});

				if (!warnings.length)
					return interaction.reply({ content: `\`❌\` ${user.username} has no warnings.`, flags: ['Ephemeral'] });

				let remainingPoints = warnings.reduce((acc, w) => acc + w.points, 0) - removePoints;

				// Delete all warnings
				await client.prisma.warnings.deleteMany({
					where: { userId: user.id, guildId: interaction.guildId! },
				});

				if (remainingPoints > 0) {
					await client.prisma.warnings.create({
						data: {
							userId: user.id,
							guildId: interaction.guildId!,
							points: remainingPoints,
							reason: 'Adjusted points',
							moderator: interaction.user.id,
						},
					});
				}

				return interaction.reply({
					content: `\`✅\` Removed ${removePoints} points from ${user.username}. Remaining points: ${remainingPoints > 0 ? remainingPoints : 0}`,
					flags: ['Ephemeral'],
				});
			}

			case 'view': {
				const warnings = await client.prisma.warnings.findMany({
					where: { userId: user.id, guildId: interaction.guildId! },
				});

				if (!warnings.length)
					return interaction.reply({ content: `\`❌\` ${user.username} has no warnings.`, flags: ['Ephemeral'] });

				const list = warnings.map((w) => `• ${w.reason} (+${w.points})`).join('\n');
				return interaction.reply({ content: `Warnings for ${user.username}:\n${list}`, flags: ['Ephemeral'] });
			}

			case 'config': {
				const action = interaction.options.getString('action', true);
				const points = interaction.options.getInteger('points', true);

				if (!action || !points)
					return interaction.reply({ content: '`❌` Action and points are required.', flags: ['Ephemeral'] });

				const existing = await client.prisma.warningConfig.findUnique({ where: { guildId: interaction.guildId! } });
				const thresholds = existing?.thresholds ?? {};
				thresholds[action] = points;

				await client.prisma.warningConfig.upsert({
					where: { guildId: interaction.guildId! },
					update: { thresholds },
					create: { guildId: interaction.guildId!, thresholds },
				});

				return interaction.reply({
					content: `\`✅\` Updated ${action} threshold to ${points} points.`,
					flags: ['Ephemeral'],
				});
			}

			case 'preset': {
				const type = interaction.options.getString('type', true);

				let config: Record<string, number> = {};
				switch (type) {
					case 'lenient':
						config = { mute: 3, kick: 6, ban: 10 };
						break;
					case 'strict':
						config = { mute: 2, kick: 3, ban: 5 };
						break;
					case 'hardcore':
						config = { kick: 2, ban: 3 };
						break;
				}

				await client.prisma.warningConfig.upsert({
					where: { guildId: interaction.guildId! },
					update: { thresholds: config },
					create: { guildId: interaction.guildId!, thresholds: config },
				});

				return interaction.reply({
					content: `\`✅\` Applied ${type} preset: ${Object.entries(config)
						.map(([a, p]) => `${a} = ${p}`)
						.join(', ')}`,
					flags: ['Ephemeral'],
				});
			}
		}
	},
};

export default command;
