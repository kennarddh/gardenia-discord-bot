// Require the necessary discord.js classes
const fs = require('node:fs')
const path = require('node:path')
const mongoose = require('mongoose')
const util = require('util')

require('dotenv').config()
const {
	Client,
	Events,
	GatewayIntentBits,
	MessageFlags,
	Collection,
} = require('discord.js')

const { setupWeatherEventTimer } = require('./timer/weatherEventTimer')

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildExpressions,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.AutoModerationConfiguration,
		GatewayIntentBits.AutoModerationExecution,
	],
})

client.commands = new Collection()
client.cooldowns = new Collection()

const commandsPath = path.join(__dirname, 'commands')

const commandFolders = fs.readdirSync(commandsPath)

for (const folder of commandFolders) {
	const folderPath = path.join(commandsPath, folder)

	if (fs.statSync(folderPath).isDirectory()) {
		const commandFiles = fs
			.readdirSync(folderPath)
			.filter(file => file.endsWith('.js'))

		for (const file of commandFiles) {
			const filePath = path.join(folderPath, file)
			const command = require(filePath)

			if (
				command &&
				typeof command === 'object' &&
				'data' in command &&
				'execute' in command
			) {
				client.commands.set(command.data.name, command)
			} else {
				if (Object.keys(command).length > 0) {
					console.log(
						`[The command at ${filePath} is missing "data" or "execute".`,
					)
				}
			}
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return

	const command = interaction.client.commands.get(interaction.commandName)
	if (!command) {
		console.error(
			`No command matching ${interaction.commandName} was found.`,
		)
		return
	}

	const { cooldowns } = interaction.client

	if (!cooldowns.has(command.data.name)) {
		cooldowns.set(command.data.name, new Collection())
	}

	const now = Date.now()
	const timestamps = cooldowns.get(command.data.name)
	const defaultCooldownDuration = 3
	const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000

	if (timestamps.has(interaction.user.id)) {
		const expirationTime =
			timestamps.get(interaction.user.id) + cooldownAmount

		if (now < expirationTime) {
			const timeLeft = ((expirationTime - now) / 1000).toFixed(1)
			return interaction.reply({
				content: `Please wait **${timeLeft}s** before reusing \`${command.data.name}\`.`,
				flags: MessageFlags.Ephemeral,
			})
		}
	}

	timestamps.set(interaction.user.id, now)
	setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount)

	try {
		try {
			await command.execute(interaction)
		} catch (error) {
			console.error(
				`Error executing command ${interaction.commandName}:`,
				error,
			)
			
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral,
				})
			} else {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral,
				})
			}
		}
	} catch (err) {
		console.error('Error handling interaction:', err)
	}
})

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

async function startBot() {
	try {
		await mongoose.connect(process.env.MONGO_URI, {
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,
			family: 4,
		})

		console.log('Connected to MongoDB!')
	} catch (err) {
		console.error('MongoDB connection error:', err)

		process.exit(1)
	}

	await setupWeatherEventTimer()

	await client.login(process.env.DISCORD_TOKEN)
}

startBot()
