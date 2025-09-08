import { ObjectNameIDArray } from './types.js';

import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config();

export type webhookArray = Array<{ name: string; id: string; token: string }>;

export interface ConfigInterface {
	baseUrl: string;
	client: { token: string; id: string; secret: string };
	guilds: ObjectNameIDArray;
	roles: ObjectNameIDArray;
	channels: ObjectNameIDArray;
	webhooks: webhookArray;
	colors: {
		success: number;
		error: number;
		warning: number;
		info: number;
		secondary: number;
		primary: number;
	};
}

export const config: ConfigInterface = {
	baseUrl: 'http://logs.stachio.dk',
	client: {
		token: process.env.HELPER_CLIENT_TOKEN as string,
		id: process.env.HELPER_CLIENT_ID as string,
		secret: process.env.HELPER_CLIENT_SECRET as string,
	},
	guilds: [
		{
			name: 'Stachio',
			id: '1413898198266941522',
		},
	],
	roles: [
		{
			name: 'Staff Role For Apply',
			id: process.env.STAFF_ROLE_ID_FOR_APPLY_TICKET,
		},
		{
			name: 'Staff Role For Report',
			id: process.env.STAFF_ROLE_ID_FOR_REPORT_TICKET,
		},
		{
			name: 'Staff Role For Contact',
			id: process.env.STAFF_ROLE_ID_FOR_CONTACT_TICKET,
		},
		{
			name: 'Staff Role For Appeal',
			id: process.env.STAFF_ROLE_ID_FOR_APPEAL_TICKET,
		},
	],
	channels: [
		{
			name: 'Known Users Log Channel',
			id: process.env.KNOWN_USERS_CHANNEL,
		},
		{
			name: 'Known Guilds Log Channel',
			id: process.env.KNOWN_GUILDS_CHANNEL,
		},
		{
			name: 'Joins Log Channel',
			id: process.env.JOINS_CHANNEL,
		},
		{
			name: 'Apply Staff Ticket Channel',
			id: process.env.APPLY_STAFF_TICKET_PANEL_CHANNEL_ID,
		},
		{
			name: 'Report Ticket Channel',
			id: process.env.REPORT_TICKET_PANEL_CHANNEL_ID,
		},
		{
			name: 'Contact Ticket Channel',
			id: process.env.CONTACT_TICKET_PANEL_CHANNEL_ID,
		},
		{
			name: 'Appeal Ticket Channel',
			id: process.env.APPEAL_TICKET_PANEL_CHANNEL_ID,
		},
		{
			name: 'Report Transcript Channel',
			id: process.env.REPORT_TRANSCRIPT_CHANNEL_ID,
		},
		{
			name: 'Appeal Transcript Channel',
			id: process.env.APPEAL_TRANSCRIPT_CHANNEL_ID,
		},
		{
			name: 'Default Transcript Channel',
			id: process.env.DEFAULT_TRANSCRIPT_CHANNEL_ID,
		},
	],
	webhooks: [],
	colors: {
		success: 0x57f287,
		error: 0xed4245,
		warning: 0xfaa61a,
		info: 0x5865f2,
		secondary: 0x2b2d31,
		primary: 0xaac49b,
	},
};
