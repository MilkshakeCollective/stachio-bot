import { ClientEvents, SlashCommandBuilder } from 'discord.js';

export type ObjectNameIDArray = Array[{ name: string; id: string }];

export interface EventInterface {
	name: keyof ClientEvents;
	options: { rest: boolean; once: boolean };
	execute: (...args: any[]) => any;
}

export interface CommandInterface {
	cooldown: number;
	isDeveloperOnly: boolean;
	data: SlashCommandBuilder | any;
	execute: (...args: any[]) => any;
}
