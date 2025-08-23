import { MilkshakeClient } from '../../index.js';
import { logger } from '../../components/exports.js';
import { CommandInterface, EventInterface } from '../../types.js';
import { ContextMenuCommandInteraction, EmbedBuilder, Events } from 'discord.js';

const cooldowns: Map<string, Map<string, number>> = new Map();

const event: EventInterface = {
	name: Events.InteractionCreate,
	options: { once: false, rest: false },
	execute: async (interaction: ContextMenuCommandInteraction, client: MilkshakeClient) => {
		if (!interaction.isContextMenuCommand()) return;

		const command: CommandInterface | undefined = client.context.get(interaction.commandName);
		if (!command) {
			logger.error(`(CONTEXT) Command not found: ${interaction.commandName}`);
			return interaction.reply({
				embeds: [new EmbedBuilder().setColor('Red').setDescription(`Failed to process this command`)],
				ephemeral: true,
			});
		}

		const now = Date.now();
		const cooldownAmount = (command.cooldown ?? 3) * 1000; // Default to 3 seconds if no cooldown is set

		if (!cooldowns.has(command.data.name)) {
			cooldowns.set(command.data.name, new Map());
		}

		const timestamps = cooldowns.get(command.data.name)!;
		const userCooldown = timestamps.get(interaction.user.id);

		if (userCooldown) {
			const remaining = userCooldown + cooldownAmount - now;

			if (remaining > 0) {
				const time = Math.ceil(remaining / 1000);
				return interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setColor('Red')
							.setDescription(`Please wait **${time}** more second(s) before using this command again.`),
					],
					ephemeral: true,
				});
			}
		}

		// Set the cooldown for the user
		timestamps.set(interaction.user.id, now);
		setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

		try {
			await command.execute(interaction, client);
		} catch (error) {
			logger.error(error);
			return interaction.reply({
				embeds: [new EmbedBuilder().setColor('Red').setDescription(`Failed to execute \`${command.data.name}\``)],
				ephemeral: true,
			});
		}
	},
};

export default event;
