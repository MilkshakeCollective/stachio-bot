import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, TextChannel } from 'discord.js';
import { EventInterface } from '../../types.js';
import { MilkshakeClient, t } from '../../index.js';
import { emojiCategories } from '../../config/emojiCategories.js';

function shuffle<T>(arr: T[]): T[] {
	return [...arr].sort(() => Math.random() - 0.5);
}

const event: EventInterface = {
	name: Events.ClientReady,
	options: { once: true, rest: false },
	execute: async (client: MilkshakeClient) => {
		const configs = await client.prisma.verificationConfig.findMany({});

		for (const cfg of configs) {
			try {
				const guild = await client.guilds.fetch(cfg.guildId).catch(() => null);
				if (!guild) continue;
				const channel = (await guild.channels.fetch(cfg.channelId).catch(() => null)) as TextChannel | null;
				if (!channel) continue;
				const message = cfg.messageId ? await channel.messages.fetch(cfg.messageId).catch(() => null) : null;
				if (message) continue;

				const pool = emojiCategories[cfg.emojiCategory] ?? emojiCategories.colors;
				const shuffled = shuffle(pool).slice(0, 3);
				const correctEmoji = shuffled[Math.floor(Math.random() * shuffled.length)];

				const embed = new EmbedBuilder()
					.setTitle(await t(guild.id, 'commands.management.verification.setup.embed.title'))
					.setDescription(
						[
							await t(guild.id, 'commands.management.verification.setup.embed._1'),
							'',
							await t(guild.id, 'commands.management.verification.setup.embed._2'),
							await t(guild.id, 'commands.management.verification.setup.embed._3', { emoji: correctEmoji }),
							'',
							await t(guild.id, 'commands.management.verification.setup.embed._4'),
						].join('\n'),
					)
					.setColor(client.config.colors.primary)
					.setFooter({ text: await t(guild.id, 'commands.management.verification.setup.embed.footer') })
					.setTimestamp();

				const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
					shuffled.map((e) =>
						new ButtonBuilder().setCustomId(`verify:pick:${e}`).setLabel(e).setStyle(ButtonStyle.Secondary),
					),
				);
				const newMsg = await channel.send({ embeds: [embed], components: [row] });
				await client.prisma.verificationConfig.update({
					where: { guildId: cfg.guildId },
					data: { messageId: newMsg.id, emojis: shuffled, correctEmoji },
				});
			} catch {}
		}
	},
};

export default event;
