import { ObjectNameIDArray } from '../types.js';

import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config();

export type webhookArray = Array<{ name: string; id: string; token: string }>;

export interface ConfigInterface {
	client: { token: string; id: string; secret: string };
	guilds: ObjectNameIDArray;
	channels: ObjectNameIDArray;
	webhooks: webhookArray;
	APIs: ObjectNameIDArray;
	colors: {
		success: number;
		error: number;
		warning: number;
		info: number;
		secondary: number;
		primary: number;
	};
}

export const defaultLanguage: string = process.env.DEFAULT_LANGUAGE as string;
export const config: ConfigInterface = {
	client: {
		token: process.env.CLIENT_TOKEN as string,
		id: process.env.CLIENT_ID as string,
		secret: process.env.CLIENT_SECRET as string,
	},
	guilds: [
		{
			name: 'Milkshake Collective',
			id: '1396235829579485214',
		},
	],
	channels: [
		{
			name: 'Weekly Report Channel',
			id: process.env.WEEKLY_REPORT_CHANNEL_ID,
		},
		{
			name: 'Appeal Log Channel',
			id: process.env.APPEAL_LOG_CHANNEL_ID,
		},
		{
			name: 'Watchdog Report Channel',
			id: process.env.WATCHDOG_REPORT_CHANNEL_ID,
		},
		{
			name: 'Watchdog Report Log Channel',
			id: process.env.WATCHDOG_REPORT_LOG_CHANNEL_ID,
		},
	],
	webhooks: [],
	APIs: [
		{ name: 'Perspective API Key', id: process.env.PERSPECTIVE_API_KEY },
		{ name: 'OpenAI API Key', id: process.env.OPENAI_API_KEY },
	],
	colors: {
		success: 0x57f287,
		error: 0xed4245,
		warning: 0xfaa61a,
		info: 0x5865f2,
		secondary: 0x2b2d31,
		primary: 0xaac49b,
	},
};
