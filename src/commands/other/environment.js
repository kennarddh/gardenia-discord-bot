const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { getGameEpoch, decodeGameEpoch } = require('../../utils/timeSystem')
const { gameData } = require('../../gameData')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('environment')
		.setDescription('View the current in-game environment.'),

	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setTitle(`Game Environment`)
			.setColor('#F1C40F')
			.setDescription(
				`The in-game environment affects plant growth and mutation chances. Check back regularly to see how the environment changes!`,
			)

		const { formatted, isDay } = decodeGameEpoch(getGameEpoch())

		const lastWeatherEventTime =
			gameData.lastWeatherEvent === null
				? null
				: decodeGameEpoch(gameData.lastWeatherEvent.timestamp)

		embed.addFields(
			{ name: 'Current Time', value: formatted, inline: true },
			{
				name: 'Environment',
				value: isDay ? 'Day 🌞' : 'Night 🌜',
				inline: true,
			},
			{
				name: 'Last Weather Event',
				value: gameData.lastWeatherEvent
					? `${gameData.lastWeatherEvent.selectedMutation.name} (happened at ${lastWeatherEventTime.formatted})`
					: 'No weather events have occurred yet.',
				inline: false,
			},
		)

		await interaction.reply({ embeds: [embed] })
	},
}
