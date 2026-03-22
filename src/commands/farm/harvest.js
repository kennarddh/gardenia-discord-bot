const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')
const plantsData = require('../../data/plantsData')
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')
const { calculatePlantValue } = require('../../utils/calculatePlantValue')
const { checkAchievements } = require('../../utils/checkAchievements')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('harvest')
		.setDescription(
			'Harvest a specific plant from your garden using its index number.',
		)
		.addIntegerOption(option =>
			option
				.setName('index')
				.setDescription('The number of the plant in your /garden')
				.setRequired(true)
				.setMinValue(1),
		),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			const profile = await UserProfile.findOne({
				userId: interaction.user.id,
			})

			if (!profile) {
				return sendNoProfileMessage(interaction)
			}

			if (profile.activeGarden.length === 0) {
				return interaction.editReply({
					content: 'You have nothing planted in your garden!',
				})
			}

			const userIndex = interaction.options.getInteger('index')
			const arrayIndex = userIndex - 1

			if (arrayIndex >= profile.activeGarden.length) {
				return interaction.editReply({
					content: `Invalid index! You only have **${profile.activeGarden.length}** plants in your garden.`,
				})
			}

			const plantToHarvest = profile.activeGarden[arrayIndex]

			if (plantToHarvest.isFavorited) {
				return interaction.editReply({
					content:
						'You cannot harvest this plant because it is **favorited**. Unfavorite it first to harvest.',
				})
			}

			if (Date.now() < plantToHarvest.readyAt) {
				const timestamp = Math.floor(plantToHarvest.readyAt / 1000)
				return interaction.editReply({
					content: `That plant is not ready yet! It will be fully grown <t:${timestamp}:R>.`,
				})
			}
			const baseData = plantsData[plantToHarvest.plantName]

			const tracker = profile.tracking.harvestPlants
			tracker.set(
				plantToHarvest.plantName,
				(tracker.get(plantToHarvest.plantName) || 0) + 1,
			)
			tracker.set('total', (tracker.get('total') || 0) + 1)

			const mutation = plantToHarvest.mutation || []
			const variant = plantToHarvest.variant || 'Normal'
			const weight = plantToHarvest.weight
			const baseValue = baseData.baseValue
			const baseWeight = baseData.baseWeight

			let baseMutatedValue = calculatePlantValue(
				mutation,
				weight,
				baseWeight,
				baseValue,
				variant,
			)

			if (isNaN(baseMutatedValue) || baseMutatedValue === null) {
				console.error(
					`calculatePlantValue returned NaN for ${plantToHarvest.plantName}!`,
				)
				baseMutatedValue = baseValue
			}

			profile.inventory.push({
				name: plantToHarvest.plantName,
				mutation: mutation,
				variant: variant,
				value: Math.round(baseMutatedValue),
				weight: weight,
				isFavorited: false,
			})

			let prefix = ''
			if (variant !== 'Normal') prefix += variant + ' '
			if (mutation.length > 0) prefix += mutation.join(' ') + ' '

			const plantDisplayName = `${prefix}**${plantToHarvest.plantName}**`

			profile.activeGarden.splice(arrayIndex, 1)

			profile.markModified('inventory')

			profile.markModified('tracking')

			await checkAchievements(profile)

			await profile.save()

			const embed = new EmbedBuilder()
				.setTitle('Harvest Complete!')
				.setColor('#43B581')
				.setDescription(
					`You successfully harvested 1x ${plantDisplayName} (${weight}kg)!`,
				)
				.setFooter({ text: 'Use /inventory to see your crops!' })

			await interaction.editReply({ embeds: [embed] })
		} catch (err) {
			console.error('Error in /harvest:', err)
			await interaction.editReply({
				content:
					'Something went wrong while trying to harvest your plant.',
			})
		}
	},
}
