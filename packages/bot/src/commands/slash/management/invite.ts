import { MilkshakeClient, t } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextChannel,
	ChannelType,
	EmbedBuilder,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('invitetracker')
		.setDescription('Manage and setup the invite tracking system')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) =>
			sub
				.setName('setup')
				.setDescription('Set up or update the invite tracking system')
				.addChannelOption((opt) =>
					opt
						.setName('log_channel')
						.setDescription('Channel where invite logs will be sent')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('log')
				.setDescription('View or update the invite log channel')
				.addChannelOption((opt) =>
					opt.setName('channel').setDescription('New log channel').addChannelTypes(ChannelType.GuildText),
				),
		)
		.addSubcommand((sub) => sub.setName('toggle').setDescription('Enable or disable invite tracking in this server')),

	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const { options, guild } = interaction;
		const sub = options.getSubcommand();
		const guildId = guild!.id;

		const existing = await client.prisma.inviteConfig.findUnique({ where: { guildId } });

		switch (sub) {
			case 'setup': {
				const log_channel = options.getChannel('log_channel') as TextChannel;

				if (existing) {
					await client.prisma.inviteConfig.update({
						where: { guildId },
						data: { enabled: true, logChannel: log_channel.id },
					});
				} else {
					await client.prisma.inviteConfig.create({
						data: { guildId, enabled: true, logChannel: log_channel.id },
					});
				}

				return interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setTitle(await t(guildId, 'commands.management.invite.setup.embed.title'))
							.setDescription(
								[
									await t(guildId, 'commands.management.invite.setup.embed._1', { channelId: log_channel.id }),
									await t(guildId, 'commands.management.invite.setup.embed._2'),
								].join('\n'),
							)
							.setColor(client.config.colors.primary)
							.setFooter({ text: await t(guildId, 'commands.management.invite.setup.embed.footer') }),
					],
				});
			}

			case 'log': {
				if (!existing) {
					return interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setDescription(await t(guildId, 'commands.management.invite.log.noConfig'))
								.setColor(client.config.colors.primary),
						],
					});
				}

				const newChannel = options.getChannel('channel') as TextChannel;
				if (!newChannel) {
					return interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setDescription(
									await t(guildId, 'commands.management.invite.log.current', { channelId: existing.logChannel }),
								)
								.setColor(client.config.colors.primary),
						],
					});
				}

				await client.prisma.inviteConfig.update({
					where: { guildId },
					data: { logChannel: newChannel.id },
				});

				return interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setDescription(await t(guildId, 'commands.management.invite.log.updated', { channelId: newChannel.id }))
							.setColor(client.config.colors.primary),
					],
				});
			}

			case 'toggle': {
				if (!existing) {
					return interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setDescription(await t(guildId, 'commands.management.invite.toggle.noConfig'))
								.setColor(client.config.colors.primary),
						],
					});
				}

				const newState = !existing.enabled;

				await client.prisma.inviteConfig.update({
					where: { guildId },
					data: { enabled: newState },
				});

				return interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setDescription(
								await t(guildId, `commands.management.invite.toggle.${newState ? 'enabled' : 'disabled'}`),
							)
							.setColor(client.config.colors.primary),
					],
				});
			}
		}
	},
};

export default command;
