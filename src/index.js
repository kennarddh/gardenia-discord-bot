// Require the necessary discord.js classes
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
require("dotenv").config();
const { 
	Client, 
	Events, 
	GatewayIntentBits, 
	MessageFlags, 
	Collection 
} = require("discord.js");

// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildEmojisAndStickers,
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

// Store commands & cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Path to your commands folder
const commandsPath = path.join(__dirname, "commands");

// Get all .js files from /commands
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

mongoose.connect(process.env.MONGO_URI)

.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("MongoDB connection error:", err));

// Load each command file
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);

	if ("data" in command && "execute" in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[⚠️ WARNING] The command at ${filePath} is missing "data" or "execute".`);
	}
}

// Handle interactions (slash commands)
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`❌ No command matching ${interaction.commandName} was found.`);
		return;
	}

	// ---------------- Cooldown System ----------------
	const { cooldowns } = interaction.client;

	if (!cooldowns.has(command.data.name)) {
		cooldowns.set(command.data.name, new Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.data.name);
	const defaultCooldownDuration = 3;
	const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

	if (timestamps.has(interaction.user.id)) {
		const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
			return interaction.reply({ 
				content: `Please wait **${timeLeft}s** before reusing \`${command.data.name}\`.`, 
				ephemeral: true 
			});
		}
	}

	timestamps.set(interaction.user.id, now);
	setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
	// -------------------------------------------------

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: "❌ There was an error while executing this command!", flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: "❌ There was an error while executing this command!", flags: MessageFlags.Ephemeral });
		}
	}
});

// When the bot is ready
client.once(Events.ClientReady, readyClient => {
	console.log("✅ Ready! Logged in as ${readyClient.user.tag}");
});

// Login with token
client.login(process.env.DISCORD_TOKEN);