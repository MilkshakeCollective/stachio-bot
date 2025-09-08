import { WebhookClient, EmbedBuilder } from 'discord.js';
import { logger } from '../components/exports.js';

// Config toggles
const ENABLE_CRASH_HANDLER = process.env.ENABLE_CRASH_HANDLER === 'true';
const ENABLE_CRASH_WEBHOOK = process.env.ENABLE_CRASH_WEBHOOK === 'true';
const EXIT_ON_CRASH = process.env.EXIT_ON_CRASH === 'true';

// Webhook setup
const webhookURL = process.env.CRASH_HANDLER_WEBHOOK as string;
const webhookClient = ENABLE_CRASH_WEBHOOK && webhookURL ? new WebhookClient({ url: webhookURL }) : null;

function sendErrorToWebhook(title: string, details?: string) {
	if (!webhookClient) return;

	const embed = new EmbedBuilder()
		.setTitle('⚠️ Error Report')
		.setColor("Red")
		.addFields(
			{ name: 'Title', value: title || 'No title provided' },
			{ name: 'Details', value: details ? `\`\`\`${details.slice(0, 1000)}\`\`\`` : 'No details available' }
		)
		.setTimestamp();

	webhookClient.send({ embeds: [embed] }).catch((e) => {
		logger.error('❌ Failed to send error webhook:', e);
	});
}

export function loadCrashHandler() {
	if (!ENABLE_CRASH_HANDLER) {
		logger.info('Crash handler disabled by config.');
		return;
	}

	// Unhandled Promise Rejections
	process.on('unhandledRejection', (reason: unknown, promise) => {
		const message = reason instanceof Error ? reason.message : String(reason);
		const stack = reason instanceof Error ? reason.stack : undefined;

		logger.error('🚨 Unhandled Promise Rejection:');
		logger.error('👉 Reason:', reason);
		logger.error('👉 Promise:', promise);
		if (stack) logger.error('👉 Stack:', stack);

		logger.error({ message: 'Unhandled Promise Rejection', reason, promise });
		sendErrorToWebhook(message, stack);
	});

	// Uncaught Exceptions
	process.on('uncaughtException', (error: Error) => {
		logger.error('🚨 Uncaught Exception:');
		logger.error('👉 Name:', error.name);
		logger.error('👉 Message:', error.message);
		logger.error('👉 Stack:', error.stack);

		logger.error({ message: 'Uncaught Exception', error });
		sendErrorToWebhook(error.message, error.stack);

		if (EXIT_ON_CRASH) {
			logger.error('💀 Exiting process due to uncaught exception.');
			process.exit(1);
		}
	});

	// Uncaught Exception Monitor
	process.on('uncaughtExceptionMonitor', (error: Error) => {
		logger.error('🚨 Uncaught Exception Monitor:');
		logger.error('👉 Name:', error.name);
		logger.error('👉 Message:', error.message);
		logger.error('👉 Stack:', error.stack);

		logger.error({ message: 'Uncaught Exception Monitor', error });
		sendErrorToWebhook(error.message, error.stack);
	});

	// Process Warnings
	process.on('warning', (warning: Error) => {
		logger.warn('⚠️ Process Warning:');
		logger.warn('👉 Name:', warning.name);
		logger.warn('👉 Message:', warning.message);
		logger.warn('👉 Stack:', warning.stack);

		logger.warn({ message: 'Process Warning', warning });
		sendErrorToWebhook(warning.name, warning.stack);
	});

	// Exit & shutdown events
	process.on('beforeExit', (code) => {
		logger.info(`Process beforeExit with code: ${code}`);
	});

	process.on('exit', (code) => {
		logger.info(`Process exited with code: ${code}`);
	});

	['SIGINT', 'SIGTERM'].forEach((signal) => {
		process.on(signal, () => {
			logger.info(`Received ${signal}, shutting down gracefully...`);
			process.exit(0);
		});
	});

	logger.info('Crash handler enabled and running.');
}
