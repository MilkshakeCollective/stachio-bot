import { MilkshakeClient } from '../index.js';
import { CommandInterface, ObjectNameIDArray } from '../types.js';
import { ApplicationCommandDataResolvable, ApplicationCommandType, Events } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path, { dirname } from 'node:path';
import { readdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { logger } from '../components/exports.js';

export async function loadCommands(client: MilkshakeClient) {
	let contextCommandsArray: Array<ApplicationCommandDataResolvable> = [];
	let contextCommandsDevArray: Array<ApplicationCommandDataResolvable> = [];
	let commandsArray: Array<ApplicationCommandDataResolvable> = [];
	let commandsDevArray: Array<ApplicationCommandDataResolvable> = [];

	const contextCommandsFolder = path.resolve(dirname(fileURLToPath(import.meta.url)), '../commands/context');
	const slashCommandsFolder = path.resolve(dirname(fileURLToPath(import.meta.url)), '../commands/slash');

	const processFolder = async (folder: string, isContext: boolean) => {
		try {
			const files = readdirSync(folder);
			await Promise.all(
				files.map(async (file) => {
					const filePath = path.join(folder, file);
					const fileStat = await stat(filePath);
					const isDirectory = fileStat.isDirectory();

					if (isDirectory) {
						await processFolder(filePath, isContext);
					} else if (file.endsWith('.js')) {
						const command: CommandInterface = (await import(pathToFileURL(filePath).toString())).default;
						if (isContext) {
							client.context.set(command.data.name, command);
							if (
								command.data.type === ApplicationCommandType.Message ||
								command.data.type === ApplicationCommandType.User
							) {
								if (command.isDeveloperOnly) {
									contextCommandsDevArray.push(command.data.toJSON());
								} else {
									contextCommandsArray.push(command.data.toJSON());
								}
							}
						} else {
							client.commands.set(command.data.name, command);
							if (command.isDeveloperOnly) {
								commandsDevArray.push(command.data.toJSON());
							} else {
								commandsArray.push(command.data.toJSON());
							}
						}
					}
				}),
			);
		} catch (error) {
			logger.error(`Error processing folder: ${folder}`, error);
		}
	};

	await processFolder(contextCommandsFolder, true);
	await processFolder(slashCommandsFolder, false);

	client.on(Events.ClientReady, async () => {
		await client.application?.commands.set([...contextCommandsArray, ...commandsArray]);

		if (client.config.guilds) {
			client.config.guilds.forEach(async (guild: ObjectNameIDArray) => {
				await client.guilds.cache.get(guild.id)?.commands.set([...contextCommandsDevArray, ...commandsDevArray]);
			});
		}
	});
}
