import { ButtonInteraction, Events, TextChannel } from 'discord.js';
import { EventInterface } from '../../types.js';
import { MilkshakeClient, t } from '../../index.js';
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
			return interaction.editReply({ content: await t(guild.id, 'events.verification.config_error') });
		}
		if (!config) return interaction.editReply({ content: await t(guild.id, 'events.verification.not_configured') });

		if (interaction.message.id !== config.messageId)
			return interaction.editReply({ content: await t(guild.id, 'events.verification.button_inactive') });

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
			return interaction.editReply({ content: await t(guild.id, 'events.verification.already_verified') });
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
				await log(await t(guild.id, 'events.verification.success_log', { user_name: user.username, user_id: user.id }));
				if (config.dmOnSuccess) {
					await user
						.send(await t(guild.id, 'events.verification.success_dm', { guild_name: guild.name, guild_id: guild.id }))
						.catch(() => {});
				}
				return interaction.editReply({ content: await t(guild.id, 'events.verification.success_verified') });
			} catch (err) {
				logger.error({
					message: `Verification success flow failed: ${err}`,
					labels: { user: user.id, guild: guild.id },
				});
				return interaction.editReply({ content: await t(guild.id, 'events.verification.role_assign_error') });
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
					await log(await t(guild.id, 'events.verification.kick_log', { user_name: user.username, user_id: user.id }));
				} else {
					await log(await t(guild.id, 'events.verification.max_attempts_log', { user_name: user.username, user_id: user.id }));
				}
			}

			if (config.kickOnFail) {
				try {
					if (config.dmOnFailure) {
						await user
							.send(await t(guild.id, 'events.verification.kick_dm', { guild_name: guild.name, guild_id: guild.id }))
							.catch(() => {});
					}
					const member = await guild.members.fetch(user.id).catch(() => null);
					if (member) await member.kick('Failed verification too many times');
					return interaction.editReply({ content: await t(guild.id, 'events.verification.kick_notice') });
				} catch (err) {
					logger.error({ message: `Kick failed: ${err}`, labels: { user: user.id, guild: guild.id } });
					await log(await t(guild.id, 'events.verification.kick_failed_log', { user_name: user.username, user_id: user.id }));
					return interaction.editReply({ content: await t(guild.id, 'events.verification.kick_error') });
				}
			} else {
				if (config.dmOnFailure) {
					await user
						.send(await t(guild.id, 'events.verification.fail_dm', { guild_name: guild.name, guild_id: guild.id }))
						.catch(() => {});
				}

				return interaction.editReply({ content: await t(guild.id, 'events.verification.fail_notice') });
			}
		}

		const left = Math.max(0, config.maxAttempts - newAttempts);
		try {
			if (config.dmOnFailure) {
				await user
					.send(await t(guild.id, 'events.verification.wrong_dm', { attempts_left: left, guild_name: guild.name, guild_id: guild.id }))
					.catch(() => {});
			}
		} catch {}
		return interaction.editReply({ content: await t(guild.id, 'events.verification.wrong_notice', { attempts_left: left }) });
	},
};

export default event;
