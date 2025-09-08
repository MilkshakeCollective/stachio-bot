import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Events,
	Message,
	PermissionFlagsBits,
	TextChannel,
} from 'discord.js';
import { EventInterface } from '../../types.js';
import { HelperClient } from '../../index.js';
import { createTranscript } from 'discord-html-transcripts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const event: EventInterface = {
	name: Events.InteractionCreate,
	options: { once: false, rest: false },
	execute: async (interaction: ButtonInteraction, client: HelperClient) => {
		if (!interaction.isButton()) return;
		const { customId, guild, channel, user } = interaction;
		if (!guild || !channel) return;

		const textChannel = channel as TextChannel;

		if (!interaction.deferred && !interaction.replied) {
			await interaction.deferReply({ flags: ['Ephemeral'] });
		}

		if (customId.startsWith('ticket_create_')) {
			const type = customId.split('ticket_create_')[1];

			const openTickets = guild.channels.cache.filter(
				(c): c is TextChannel =>
					c instanceof TextChannel && !!c.topic?.includes(`creator:${user.id}`) && c.name.startsWith(type),
			);

			if (openTickets.size >= 1)
				return interaction.editReply({
					content: '`❌` You already have 1 open tickets of this type. Please close one before opening a new ticket.',
				});

			const randomId = nanoid(8);
			const channelName = `${type}-${randomId}`;

			const staffRolesMap: Record<string, string> = {
				apply: client.config.roles[0].id,
				report: client.config.roles[1].id,
				staff: client.config.roles[2].id,
				appeal: client.config.roles[3].id,
			};
			const staffRoleId = staffRolesMap[type];
			if (!staffRoleId) return interaction.editReply({ content: 'No staff role configured for this ticket type.' });

			const ticketChannel = (await guild.channels.create({
				name: channelName,
				type: 0,
				permissionOverwrites: [
					{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
					{
						id: user.id,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
							PermissionFlagsBits.ReadMessageHistory,
						],
					},
					{
						id: staffRoleId,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
							PermissionFlagsBits.ReadMessageHistory,
						],
					},
				],
			})) as TextChannel;

			const messages: Record<string, string> = {
				apply: [
					`## **\`📝 Staff Application\`**`,
					`Welcome <@${user.id}>! <@&${staffRoleId}> has been notified and will review your application.`,
					`Thank you for your interest in joining the **Stachio Staff Team**. Please take your time and fill out your application carefully.`,
					``,
					`**Application Guidelines:**`,
					`> 1. Introduce yourself (age, timezone, background)`,
					`> 2. Explain why you want to join the staff team`,
					`> 3. Describe any past moderation or community management experience`,
					`> 4. Share your availability and activity level`,
					`> 5. Explain how you would handle difficult situations`,
					`> 6. Specify which team you are applying for:`,
					`   - **Appeals Staff** (reviews appeals of bans, blacklists, and Watchdog marks)`,
					`   - **Reports Staff** (investigates scam/abuse reports and assists users)`,
					`   - **Watchdog Staff** (handles global monitoring, blacklists, and high-level investigations)`,
					``,
					`\`⚠️\` **Important:** Answer honestly and thoroughly. Incomplete or vague applications may be denied.`,
					`Our recruitment staff will review your application shortly — please be patient.`,
					``,
					`\`🔒\` **Privacy Notice:** Applications are **private**. Only you and staff can see this ticket.`,
				].join('\n'),

				report: [
					`## **\`🔎 Watchdog Report\`**`,
					`Welcome <@${user.id}>! <@&${staffRoleId}> has been notified and will assist you.`,
					``,
					`**Please provide the following details:**`,
					`> 1. Accused User(s) (Discord Tag & ID)`,
					`> 2. Detailed description of what happened`,
					`> 3. Where it happened (server, DMs, marketplace, etc.)`,
					`> 4. Any relevant payment details (if scam-related)`,
					`> 5. Screenshots, receipts, or other proof`,
					``,
					`\`⚠️\` **Reminder:** Please do **not ping staff**. They will review your case as soon as possible.`,
					`All information here is reviewed **only by Watchdog staff**.`,
					``,
					`\`🔒\` **Privacy Notice:** Reports are **publicly visible**. Please censor sensitive details (emails, payment IDs, addresses, etc.) before posting.`,
				].join('\n'),

				staff: [
					`## **\`📩 Contact Staff\`**`,
					`Hello <@${user.id}>! <@&${staffRoleId}> has been notified and will assist you shortly.`,
					`You have opened a **Contact Staff** ticket. Please explain your reason for contacting us clearly so we can assist you efficiently.`,
					``,
					`**Examples of what you can use this ticket for:**`,
					`> 1. Questions about the server or rules`,
					`> 2. Concerns about staff conduct`,
					`> 3. Reporting a technical issue (not scam/ban related)`,
					`> 4. General support`,
					``,
					`\`⚠️\` Please remain respectful and provide as much detail as possible.`,
					`A staff member will respond to you soon.`,
					``,
					`\`🔒\` **Privacy Notice:** Contact Staff tickets are **private**. Only you and staff can see this ticket.`,
				].join('\n'),

				appeal: [
					`## **\`🛡️ Appeal Ticket\`**`,
					`Welcome <@${user.id}>! <@&${staffRoleId}> has been notified and will review your appeal.`,
					`You are appealing a **Watchdog mark, guild blacklist, or sanction**. Please follow the format below so staff can properly review your case:`,
					``,
					`**Appeal Format:**`,
					`> 1. What action are you appealing (ban, guild blacklist, Watchdog mark, etc.)?`,
					`> 2. Why do you believe this action was unjustified?`,
					`> 3. Provide any supporting evidence`,
					`> 4. What steps have you taken to prevent this from happening again?`,
					``,
					`\`⚠️\` **Note:** Appeals are reviewed carefully. Be honest and respectful — false or misleading information may result in permanent denial.`,
					``,
					`\`🔒\` **Privacy Notice:** Appeals are **publicly visible**. Please censor or avoid sharing sensitive personal details.`,
				].join('\n'),
			};

			const initialMessage = messages[type] ?? `Ticket created by <@${user.id}> (${type})`;

			await ticketChannel.setTopic(`creator:${user.id};type:${type}`);

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger),
			);

			await ticketChannel.send({ content: initialMessage, components: [row] }).then((msg: Message) => {
				msg.pin('initial Ticket Message');
			});
			await interaction.editReply({ content: `\`✅\` Your ticket has been created: ${ticketChannel}` });

			if (type === 'appeal') {
				const blacklistedUser = await client.prisma.users.findUnique({ where: { userId: user.id } });
				const blacklistedGuilds = await client.prisma.guilds.findMany({
					where: { ownerId: user.id, status: 'BLACKLISTED' },
				});

				if (blacklistedUser || blacklistedGuilds.length > 0) {
					await delay(500);

					let messageLines: string[] = [
						`## **🚨 Watchdog Appeal Notice**`,
						`Hello <@${user.id}>, our records indicate the following regarding your account:`,
						``,
					];

					if (blacklistedUser) {
						messageLines.push(
							`**User Blacklist Details:**`,
							`> **Reason:** ${blacklistedUser.reason || 'No reason provided'}`,
							`> **Status:** ${blacklistedUser.status}`,
							``,
						);

						if (Array.isArray(blacklistedUser.evidence) && blacklistedUser.evidence.length > 0) {
							messageLines.push(`**Evidence Provided:**`);
							for (const proof of blacklistedUser.evidence) {
								messageLines.push(`> 📎 ${proof}`);
							}
							messageLines.push('');
						}
					}

					if (blacklistedGuilds.length > 0) {
						messageLines.push(`**Blacklisted Guilds Owned:**`);
						for (const g of blacklistedGuilds) {
							messageLines.push(
								`> **Name:** ${g.name || 'Unknown'}`,
								`> **ID:** ${g.guildId}`,
								`> **Type:** ${g.type}`,
								`> **Reason:** ${g.reason || 'No reason provided'}`,
								``,
							);
						}
					}

					messageLines.push(
						`\`📌\` **Next Steps:** Please provide any counter-evidence, context, or explanations for your blacklist(s) and/or blacklisted guild(s).`,
						`\`⚠️\` **Note:** Staff will review all responses carefully. Be honest and respectful. Do not share sensitive information without censoring.`,
					);

					await ticketChannel.send({ content: messageLines.join('\n') });
				}
			}

			return;
		}

		const channelTicketButtons = interaction.channel as TextChannel;
		if (
			!channelTicketButtons ||
			!['apply', 'report', 'staff', 'appeal'].some((t) => channelTicketButtons.name.startsWith(t))
		)
			return;

		const ticketType = ['apply', 'report', 'staff', 'appeal'].find((t) => channelTicketButtons.name.startsWith(t));
		if (!ticketType) return;

		const staffRolesMap: Record<string, string> = {
			apply: client.config.roles[0].id,
			report: client.config.roles[1].id,
			staff: client.config.roles[2].id,
			appeal: client.config.roles[3].id,
		};

		const staffRoleId = staffRolesMap[ticketType];
		if (!staffRoleId) return;

		if (customId === 'ticket_close') {
			const topic = channelTicketButtons.topic ?? '';
			const match = topic.match(/creator:(\d+)/);
			const creatorId = match ? match[1] : null;

			const member = guild.members.cache.get(user.id);
			const isStaff = member?.roles.cache.has(staffRoleId);
			const isCreator = creatorId === user.id;

			if (!isStaff && !isCreator)
				return interaction.editReply({ content: '❌ You do not have permission to close this ticket.' });

			await interaction.editReply({ content: 'Closing ticket...' });

			try {
				const transcript = await createTranscript(textChannel, {
					filename: `${textChannel.name}-transcript.html`,
					poweredBy: false,
				});

				const __filename = fileURLToPath(import.meta.url);
				const __dirname = path.dirname(__filename);

				const rootDir = path.resolve(__dirname, '../../../../../');
				const transcriptsDir = path.join(rootDir, 'transcripts');
				if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir, { recursive: true });

				const fileName = `${textChannel.name}-${Date.now()}.html`;
				const filePath = path.join(transcriptsDir, fileName);
				fs.writeFileSync(filePath, Buffer.from(transcript.attachment as Buffer));

				const transcriptUrl = `${client.config.baseUrl}/transcripts/${fileName}`;

				const logChannels: Record<string, string> = {
					report: client.config.channels[7].id,
					appeal: client.config.channels[8].id,
				};

				const logChannelId = logChannels[ticketType] ?? client.config.channels[9].id;
				const logChannel = guild.channels.cache.get(logChannelId) as TextChannel;
				if (logChannel)
					await logChannel.send({
						content: [
							`## **\`📄 Ticket Transcript\`**`,
							`**Ticket:** ${textChannel.name}`,
							`**Closed by:** <@${user.id}>`,
							`**Transcript URL:** [Link](${transcriptUrl})`,
							``,
							`\`📌\` Keep this transcript for record-keeping or review purposes.`,
						].join('\n'),
					});
			} catch (err) {
				console.error('Failed to create/send transcript:', err);
			}

			setTimeout(() => textChannel.delete(), 2000);
		}
	},
};

export default event;
