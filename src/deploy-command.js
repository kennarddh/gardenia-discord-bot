const { REST, Routes } = require('discord.js')
require('dotenv').config()
const fs = require('node:fs')
const path = require('node:path')

const commands = []

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
				commands.push(command.data.toJSON())
			} else {
				if (Object.keys(command).length > 0) {
					console.log(
						`The command at ${filePath} is missing a required "data" or "execute" property.`,
					)
				}
			}
		}
	}
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN)

;(async () => {
	try {
		console.log(
			`Started refreshing ${commands.length} application (/) commands.`,
		)

		const data = await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID),
			{ body: commands },
		)

		console.log(
			`Successfully reloaded ${data.length} application (/) commands.`,
		)
	} catch (error) {
		console.error(error)
	}
})()
