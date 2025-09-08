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
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 10,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('vote')
		.setDescription('Support Stachio by upvoting us on bot lists!')
		.setNSFW(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply();

		const embed = new EmbedBuilder()
			.setTitle(await t(interaction.guild!.id, 'commands.utility.vote.embed.title'))
			.setDescription(
				[
					await t(interaction.guild!.id, 'commands.utility.vote.embed._1'),
					await t(interaction.guild!.id, 'commands.utility.vote.embed._2'),
				].join('\n'),
			)
			.setColor(client.config.colors.primary)
			.setFooter({ text: await t(interaction.guild!.id, 'commands.utility.vote.embed.footer') })
			.setTimestamp();

		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel('⭐ Top.gg')
				.setStyle(ButtonStyle.Link)
				.setURL('https://top.gg/bot/1374870746006032414/vote'),
			new ButtonBuilder()
				.setLabel('📊 Discord Bot List')
				.setStyle(ButtonStyle.Link)
				.setURL('https://discordbotlist.com/bots/stachio'),
			new ButtonBuilder()
				.setLabel('📊 Discord Bots GG')
				.setStyle(ButtonStyle.Link)
				.setURL('https://discord.bots.gg/bots/1374870746006032414'),
			// new ButtonBuilder()
			// 	.setLabel('🌐 More Lists')
			// 	.setStyle(ButtonStyle.Link)
			// 	.setURL('https://example.com/all-botlists'),
		);

		return interaction.editReply({ embeds: [embed], components: [buttons] });
	},
};

export default command;
