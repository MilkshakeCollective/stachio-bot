import { Client, Collection, GatewayIntentBits, Options, Partials } from 'discord.js';
import { ConfigInterface, config } from './config.js';
import { EventInterface, CommandInterface } from './types.js';
import { loadCrashHandler } from './handlers/crash.js';
import { loadCommands } from './handlers/commands.js';
import { loadEvents } from './handlers/events.js';
import { logger } from './components/exports.js';

export class MilkshakeClient extends Client {
	public events: Collection<string, EventInterface> = new Collection();
	public commands: Collection<string, CommandInterface> = new Collection();
	public context: Collection<string, CommandInterface> = new Collection();
	public config: ConfigInterface;
	constructor() {
		super({
			intents: [
				GatewayIntentBits.AutoModerationConfiguration,
				GatewayIntentBits.AutoModerationExecution,
				GatewayIntentBits.DirectMessagePolls,
				GatewayIntentBits.DirectMessageReactions,
				GatewayIntentBits.DirectMessageTyping,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.GuildExpressions,
				GatewayIntentBits.GuildIntegrations,
				GatewayIntentBits.GuildInvites,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildMessagePolls,
				GatewayIntentBits.GuildMessageReactions,
				GatewayIntentBits.GuildMessageTyping,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildModeration,
				GatewayIntentBits.GuildPresences,
				GatewayIntentBits.GuildScheduledEvents,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.GuildWebhooks,
				GatewayIntentBits.Guilds,
				GatewayIntentBits.MessageContent,
			],
			partials: [
				Partials.Channel,
				Partials.GuildMember,
				Partials.GuildScheduledEvent,
				Partials.Message,
				Partials.Reaction,
				Partials.SoundboardSound,
				Partials.ThreadMember,
				Partials.User,
			],
			makeCache: Options.cacheWithLimits({ MessageManager: 100 }),
		});
		this.config = config;
	}

	public async InitializeClient() {
		try {
			loadCrashHandler();
			await loadEvents(this);
			await loadCommands(this);
		} catch (error) {
			logger.error(error);
		}
		this.startClient();
	}

	public startClient() {
		this.login(this.config.client.token).catch((error) => {
			logger.error('Failed to log into client user');
			logger.error(error);
		});
	}
}

new MilkshakeClient().InitializeClient();
