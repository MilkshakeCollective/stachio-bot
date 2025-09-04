import { MilkshakeClient, t } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('donate')
		.setDescription('Support Stachio via Ko-fi! 💚')
		.setNSFW(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		const kofiUrl = 'https://ko-fi.com/duckodas';

		const embed = new EmbedBuilder()
			.setTitle(await t(interaction.guild!.id, 'commands.utility.donate.embed.title'))
			.setDescription(
				[
					await t(interaction.guild!.id, 'commands.utility.donate.embed._1'),
					await t(interaction.guild!.id, 'commands.utility.donate.embed._2'),
					`[${await t(interaction.guild!.id, 'commands.utility.donate.embed._3')}](${kofiUrl})`,
				].join('\n'),
			)
			.setColor(client.config.colors.primary)
			.setFooter({ text: await t(interaction.guild!.id, 'commands.utility.donate.embed.footer') })
			.setTimestamp();

		const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel(await t(interaction.guild!.id, 'commands.utility.donate.embed.button'))
				.setEmoji('💚')
				.setStyle(ButtonStyle.Link)
				.setURL(kofiUrl),
		);

		return interaction.reply({
			embeds: [embed],
			components: [button],
			flags: ['Ephemeral'],
		});
	},
};

export default command;
