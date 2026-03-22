const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('garden')
		.setDescription('View your currently growing plants.'),

	async execute(interaction) {
		await interaction.deferReply()

		const profile = await UserProfile.findOne({
			userId: interaction.user.id,
		})

		const {
			sendNoProfileMessage,
		} = require('../../utils/showNoProfileMessage')
		if (!profile) {
			return sendNoProfileMessage(interaction)
		}

		const embed = new EmbedBuilder()
			.setTitle(`🏡 ${interaction.user.username}'s Garden`)
			.setColor('#2ECC71')
			.setDescription(
				`Slots used: **${profile.activeGarden.length} / ${profile.maxSlots}**\n\n`,
			)

		if (profile.activeGarden.length === 0) {
			embed.setDescription(
				embed.data.description +
					'*Your garden is completely empty. Use `/plant` to start growing!*',
			)
		} else {
			let gardenText = ''
			profile.activeGarden.forEach((plant, index) => {
				const timestamp = Math.floor(plant.readyAt / 1000)

				let prefix = ''

				if (plant.variant && plant.variant !== 'Normal') {
					prefix += `${plant.variant} `
				}

				if (plant.mutation && plant.mutation.length > 0) {
					prefix += `${plant.mutation.join(' ')} `
				}
				const plantDisplayName = `**${prefix}${plant.plantName}**`

				if (Date.now() >= plant.readyAt) {
					gardenText += `${index + 1}. ${plantDisplayName} - Ready to /harvest!\n`
				} else {
					gardenText += `${index + 1}. ${plantDisplayName} - Growing: <t:${timestamp}:R>\n`
				}
			})
			embed.setDescription(embed.data.description + gardenText)
		}

		await interaction.editReply({ embeds: [embed] })
	},
}
