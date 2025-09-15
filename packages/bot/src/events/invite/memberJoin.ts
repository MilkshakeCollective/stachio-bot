import { GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
import { logger } from '../../components/exports.js';

const event: EventInterface = {
	name: 'memberJoin', // custom event from discord-invite
	options: { once: false, rest: false },
	execute: async (member: GuildMember, inviter: any, invite: any, client: MilkshakeClient) => {
		try {
			if (!inviter) {
				logger.info(`${member.user.username} joined, but inviter could not be found.`);
				return;
			}

			if (typeof inviter === 'string') {
				logger.info(`${member.user.username} joined via vanity invite: ${inviter}`);
			}
			else if (member.id === inviter.id) {
				logger.info(`${member.user.username} joined with their own invite.`);
			}
			else {
				client.inviteManager.inviteAdd(member.guild.id, inviter, 1);
				const totalInvites = client.inviteManager.getMemberInvites(member.guild.id, inviter);

				logger.info(
					`${member.user.username} joined the server via invite code ${invite?.code ?? 'unknown'} by ${inviter.username}. Total invites by inviter: ${totalInvites}`,
				);

				const config = await client.prisma.inviteConfig.findUnique({
					where: { guildId: member.guild.id },
				});

				if (config?.enabled && config.logChannel) {
					const channel = member.guild.channels.cache.get(config.logChannel);
					if (channel?.isTextBased()) {
						const embed = new EmbedBuilder()
                            .setTitle(`${member.user.username} joined the server`)
							.setDescription(
								[
									`**Member:** <@${member.id}>`,
									`**Server:** ${member.guild.name}`,
									`**Invited By:** ${typeof inviter === 'string' ? `Vanity URL (${inviter})` : `<@${inviter.id}>`}`,
									`**Invite Code:** \`${invite?.code ?? 'Unknown'}\``,
									`**Joined At:** <t:${Math.floor(Date.now() / 1000)}:F>`,
								].join('\n'),
							)
							.setColor(client.config.colors.success)
							.setThumbnail(member.user.displayAvatarURL())
							.setTimestamp();

						await (channel as TextChannel).send({ embeds: [embed] });
					}
				}
			}
		} catch (err) {
			console.error(`❌ Failed to handle member join for ${member.guild.name}:`, err);
		}
	},
};

export default event;
