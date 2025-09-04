import { MilkshakeClient, t } from '../../../index.js';
import { CommandInterface } from '../../../types.js';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

const command: CommandInterface = {
	cooldown: 5,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('Invite our bot to your server!')
		.setNSFW(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user?.id}`;

		const embed = new EmbedBuilder()
			.setTitle(await t(interaction.guild!.id, "commands.utility.invite.embed.title"))
			.setDescription(
				[
					await t(interaction.guild!.id, "commands.utility.invite.embed._1"),
					'',
					await t(interaction.guild!.id, "commands.utility.invite.embed._2"),
					await t(interaction.guild!.id, "commands.utility.invite.embed._3"),
					await t(interaction.guild!.id, "commands.utility.invite.embed._4"),
					await t(interaction.guild!.id, "commands.utility.invite.embed._5"),
					await t(interaction.guild!.id, "commands.utility.invite.embed._6"),
					await t(interaction.guild!.id, "commands.utility.invite.embed._7"),
					'',
					await t(interaction.guild!.id, "commands.utility.invite.embed._8"),
				].join('\n'),
			)
			.setColor(client.config.colors.primary)
			.setFooter({ text: await t(interaction.guild!.id, "commands.utility.invite.embed.footer") })
			.setTimestamp();

		const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setLabel(await t(interaction.guild!.id, "commands.utility.invite.embed.button")).setStyle(ButtonStyle.Link).setURL(inviteUrl),
		);

		return interaction.editReply({
			embeds: [embed],
			components: [button],
		});
	},
};

export default command;
