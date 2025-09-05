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
	cooldown: 10,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription("View Stachio's commands and key features")
		.setNSFW(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply();

		const tips = [
			await t(interaction.guild!.id, 'commands.utility.help.tips._1'),
			await t(interaction.guild!.id, 'commands.utility.help.tips._2'),
			await t(interaction.guild!.id, 'commands.utility.help.tips._3'),
			await t(interaction.guild!.id, 'commands.utility.help.tips._4'),
			await t(interaction.guild!.id, 'commands.utility.help.tips._5'),
		];

		const embed = new EmbedBuilder()
			.setTitle(await t(interaction.guild!.id, 'commands.utility.help.embed.title'))
			.setDescription(
				[
					await t(interaction.guild!.id, 'commands.utility.help.embed._1'),
					await t(interaction.guild!.id, 'commands.utility.help.embed._2'),
					'### ' + (await t(interaction.guild!.id, 'commands.utility.help.embed._3')),
					await t(interaction.guild!.id, 'commands.utility.help.embed._4'),
					await t(interaction.guild!.id, 'commands.utility.help.embed._5'),
					'### ' + (await t(interaction.guild!.id, 'commands.utility.help.embed._6')),
					await t(interaction.guild!.id, 'commands.utility.help.embed._7'),
					'### ' + (await t(interaction.guild!.id, 'commands.utility.help.embed._8')),
					await t(interaction.guild!.id, 'commands.utility.help.embed._9'),
					await t(interaction.guild!.id, 'commands.utility.help.embed._10'),
					await t(interaction.guild!.id, 'commands.utility.help.embed._11'),
					await t(interaction.guild!.id, 'commands.utility.help.embed._12'),
					await t(interaction.guild!.id, 'commands.utility.help.embed._13'),
					'### ' + (await t(interaction.guild!.id, 'commands.utility.help.embed._14')),
					await t(interaction.guild!.id, 'commands.utility.help.embed._15'),
					'### ' + (await t(interaction.guild!.id, 'commands.utility.help.embed._16')),
					`${await t(interaction.guild!.id, 'commands.utility.help.embed._17')} \`${client.config.version}\``,
					`${await t(interaction.guild!.id, 'commands.utility.help.embed._18')} ${client.users.cache.get('711712752246325343')?.username} (${client.users.cache.get('711712752246325343')?.id})`,
					'',
					tips[Math.floor(Math.random() * tips.length)],
				].join('\n'),
			)
			.setColor(client.config.colors.primary)
			.setFooter({ text: await t(interaction.guild!.id, 'commands.utility.help.embed.footer') })
			.setTimestamp();

		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setEmoji('🌐')
				.setLabel(await t(interaction.guild!.id, 'commands.utility.help.buttons.website'))
				.setStyle(ButtonStyle.Link)
				.setURL('https://www.stachio.dk/'),
			new ButtonBuilder()
				.setEmoji('🤝')
				.setLabel(await t(interaction.guild!.id, 'commands.utility.help.buttons.supportServer'))
				.setStyle(ButtonStyle.Link)
				.setURL('https://www.stachio.dk/discord'),
			new ButtonBuilder()
				.setEmoji('❤️')
				.setLabel(await t(interaction.guild!.id, 'commands.utility.help.buttons.supportUs'))
				.setStyle(ButtonStyle.Link)
				.setURL('https://www.stachio.dk/support'),
			new ButtonBuilder()
				.setEmoji('➕')
				.setLabel(await t(interaction.guild!.id, 'commands.utility.help.buttons.invite'))
				.setStyle(ButtonStyle.Link)
				.setURL(`https://stachio.dk/invite`),
		);

		return interaction.editReply({ embeds: [embed], components: [buttons] });
	},
};

export default command;
