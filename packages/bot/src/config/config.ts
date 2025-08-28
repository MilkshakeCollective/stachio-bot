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
}

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
		{
			name: 'Online Safety',
			id: '1360001636424093928',
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
	],
	webhooks: [],
	APIs: [
		{ name: 'Perspective API Key', id: process.env.PERSPECTIVE_API_KEY },
		{ name: 'OpenAI API Key', id: process.env.OPENAI_API_KEY },
	],
};
