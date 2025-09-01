import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, TextChannel } from 'discord.js';
import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
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
					.setColor(client.config.colors.primary)
					.setFooter({ text: 'Verification System • Stay safe online' })
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
