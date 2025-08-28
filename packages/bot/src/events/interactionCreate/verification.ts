import { ButtonInteraction, Events, TextChannel } from 'discord.js';
import { EventInterface } from '../../types.js';
import { MilkshakeClient } from '../../index.js';
import { logger, toStringArray } from '../../components/exports.js';

const event: EventInterface = {
	name: Events.InteractionCreate,
	options: { once: false, rest: false },
	execute: async (interaction: ButtonInteraction, client: MilkshakeClient) => {
		if (!interaction.isButton()) return;

		const [ns, action, picked] = interaction.customId.split(':');
		if (ns !== 'verify' || action !== 'pick') return;

		await interaction.deferReply({ flags: ['Ephemeral'] });

		const guild = interaction.guild;
		if (!guild) return;
		const user = interaction.user;

		let config;
		try {
			config = await client.prisma.verificationConfig.findUnique({ where: { guildId: guild.id } });
		} catch (err) {
			logger.error({ message: `Failed to fetch verification config: ${err}`, labels: { guild: guild.id } });
			return interaction.editReply({ content: 'Configuration error. Please try again later.' });
		}
		if (!config) return interaction.editReply({ content: 'Verification not configured.' });

		if (interaction.message.id !== config.messageId)
			return interaction.editReply({ content: 'This button is no longer active.' });

		const verifiedRoles = toStringArray(config.verifiedRoleIds);
		const correct = config.correctEmoji;

		const attempt = await client.prisma.verificationAttempt.upsert({
			where: { guildId_userId: { guildId: guild.id, userId: user.id } },
			update: {},
			create: { guildId: guild.id, userId: user.id },
		});

		const logChannel = config.logsChannelId ? await guild.channels.fetch(config.logsChannelId).catch(() => null) : null;

		const log = async (content: string) => {
			if (logChannel && logChannel.isTextBased()) {
				try {
					await (logChannel as TextChannel).send(content);
				} catch {}
			}
		};

		if (attempt.verified) {
			return interaction.editReply({ content: 'You are already verified ✅' });
		}

		const remaining = Math.max(0, config.maxAttempts - attempt.attempts);

		if (picked === correct) {
			// success path
			try {
				const member = await guild.members.fetch(user.id);
				for (const roleId of verifiedRoles) {
					await member.roles
						.add(roleId)
						.catch((err) =>
							logger.warn({ message: `Role add failed ${roleId}: ${err}`, labels: { user: user.id, guild: guild.id } }),
						);
				}
				await client.prisma.verificationAttempt.update({
					where: { guildId_userId: { guildId: guild.id, userId: user.id } },
					data: { verified: true, lastTriedAt: new Date(), verificationConfigId: config.id },
				});
				await log(`\`✅\` ${user.tag} (${user.id}) successfully verified.`);
				if (config.dmOnSuccess) {
					await user
						.send(['`✅` You have been verified!', '', `-# Sent from **${guild.name} (${guild.id})**`].join('\n'))
						.catch(() => {});
				}
				return interaction.editReply({ content: '`✅` Verified! Welcome.' });
			} catch (err) {
				logger.error({
					message: `Verification success flow failed: ${err}`,
					labels: { user: user.id, guild: guild.id },
				});
				return interaction.editReply({ content: 'Unexpected error while assigning roles.' });
			}
		}

		const newAttempts = attempt.attempts + 1;
		await client.prisma.verificationAttempt.update({
			where: { guildId_userId: { guildId: guild.id, userId: user.id } },
			data: { attempts: newAttempts, lastTriedAt: new Date() },
		});

		if (newAttempts >= config.maxAttempts) {
			if (attempt.attempts < config.maxAttempts) {
				if (config.kickOnFail) {
					await log(`\`👢\` ${user.username} (${user.id}) was kicked for failing verification.`);
				} else {
					await log(`\`🚫\` ${user.username} (${user.id}) reached max attempts.`);
				}
			}

			if (config.kickOnFail) {
				try {
					if (config.dmOnFailure) {
						await user
							.send(
								[
									'`👢` You have been kicked for failing verification too many times.',
									'',
									`-# Sent from **${guild.name} (${guild.id})**`,
								].join('\n'),
							)
							.catch(() => {});
					}
					const member = await guild.members.fetch(user.id).catch(() => null);
					if (member) await member.kick('Failed verification too many times');
					return interaction.editReply({ content: 'You failed the verification too many times and were kicked.' });
				} catch (err) {
					logger.error({ message: `Kick failed: ${err}`, labels: { user: user.id, guild: guild.id } });
					await log(`\`⚠️\` Failed to kick ${user.username} (${user.id}). Missing permissions?`);
					return interaction.editReply({ content: 'Max attempts reached. An error occurred attempting to kick.' });
				}
			} else {
				if (config.dmOnFailure) {
					await user
						.send(
							[
								'`🚫` You have failed the verification too many times.',
								'',
								'Please contact a moderator if you believe this was a mistake or need another chance.',
								'',
								`-# Sent from **${guild.name} (${guild.id})**`,
							].join('\n'),
						)
						.catch(() => {});
				}

				return interaction.editReply({ content: 'Max attempts reached. Please contact a moderator.' });
			}
		}

		const left = Math.max(0, config.maxAttempts - newAttempts);
		try {
			if (config.dmOnFailure) {
				await user
					.send(
						[
							'`❌` Wrong emoji. Please try again.',
							'',
							`Attempts left: **${left}**`,
							'',
							`-# Sent from **${guild.name} (${guild.id})**`,
						].join('\n'),
					)
					.catch(() => {});
			}
		} catch {}
		return interaction.editReply({ content: `❌ Wrong emoji. Attempts left: **${left}**` });
	},
};

export default event;
