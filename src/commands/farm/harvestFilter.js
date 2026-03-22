const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')
const plantsData = require('../../data/plantsData')
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')
const { calculatePlantValue } = require('../../utils/calculatePlantValue')
const { checkAchievements } = require('../../utils/checkAchievements')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('harvestfilter')
		.setDescription('Harvest filtered fully grown plants from your garden.')
		.addStringOption(option => {
			option
				.setName('plant')
				.setDescription('Which type of plant to harvest')
				.setRequired(true)
				.addChoices(
					...Object.keys(plantsData).map(plantName => ({
						name: plantName,
						value: plantName,
					})),
				)

			return option
		})
		.addIntegerOption(option =>
			option
				.setName('amount')
				.setDescription(
					'How many to harvest. Leave blank to harvest ALL ready plants of this type.',
				)
				.setRequired(false)
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

			const targetPlant = interaction.options.getString('plant')
			const requestedAmount = interaction.options.getInteger('amount')
			const harvestLimit = requestedAmount ? requestedAmount : Infinity

			const now = Date.now()
			let harvestedCount = 0
			let harvestResults = []
			const newGarden = []

			for (const plant of profile.activeGarden) {
				if (
					now >= plant.readyAt &&
					plant.plantName === targetPlant &&
					harvestedCount < harvestLimit &&
					!plant.isFavorited
				) {
					harvestedCount++
					const baseData = plantsData[plant.plantName]

					const tracker = profile.tracking.harvestPlants
					tracker.set(
						plant.plantName,
						(tracker.get(plant.plantName) || 0) + 1,
					)
					tracker.set('total', (tracker.get('total') || 0) + 1)

					const mutation = plant.mutation || []
					const variant = plant.variant || 'Normal'
					const weight = plant.weight
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
							`calculatePlantValue returned NaN for ${plant.plantName}!`,
						)
						baseMutatedValue = baseValue
					}

					profile.inventory.push({
						name: plant.plantName,
						mutation: mutation,
						variant: variant,
						value: Math.round(baseMutatedValue),
						weight: weight,
						isFavorited: false,
					})

					let prefix = ''
					if (variant !== 'Normal') prefix += variant + ' '
					if (mutation.length > 0) prefix += mutation.join(' ') + ' '

					harvestResults.push(
						`• ${prefix}**${plant.plantName}** (${weight}kg)`,
					)
				} else {
					newGarden.push(plant)
				}
			}

			if (harvestedCount === 0) {
				return interaction.editReply({
					content: `You don't have any fully grown **${targetPlant}** ready to harvest yet!`,
				})
			}

			profile.activeGarden = newGarden
			profile.markModified('inventory')

			profile.markModified('tracking')

			await checkAchievements(profile)

			await profile.save()

			const embed = new EmbedBuilder()
				.setTitle('Harvest Complete!')
				.setColor('#43B581')
				.setDescription(
					`You harvested ${harvestedCount}x **${targetPlant}**:\n\n` +
						harvestResults.join('\n'),
				)
				.setFooter({ text: 'Use /inventory to see your crops!' })

			await interaction.editReply({ embeds: [embed] })
		} catch (err) {
			console.error('Error in /harvest:', err)
			await interaction.editReply({
				content:
					'Something went wrong while trying to harvest your plants.',
			})
		}
	},
}
