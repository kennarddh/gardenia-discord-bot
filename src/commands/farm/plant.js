const { SlashCommandBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')
const plantsData = require('../../data/plantsData')
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')
const { getVariants } = require('../../utils/getVariants')
const { checkAchievements } = require('../../utils/checkAchievements')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('plant')
		.setDescription('Plant seeds in your garden.')
		.addStringOption(option => {
			option
				.setName('seed')
				.setDescription('Which seed to plant')
				.setRequired(true)

			for (const plantName in plantsData) {
				option.addChoices({ name: plantName, value: plantName })
			}
			return option
		})
		.addIntegerOption(option =>
			option
				.setName('amount')
				.setDescription('How many seeds to plant')
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

			const seedName = interaction.options.getString('seed')
			const requestedAmount =
				interaction.options.getInteger('amount') || 1
			const plantInfo = plantsData[seedName]

			if (!plantInfo) {
				return interaction.editReply({
					content: "That seed doesn't exist!",
				})
			}

			const seedCount = profile.seeds.get(seedName) || 0
			if (seedCount <= 0) {
				return interaction.editReply({
					content: `You don't have any **${seedName}** seeds! Buy them from the \`/shop\`.`,
				})
			}

			const availableSlots =
				profile.maxSlots - profile.activeGarden.length
			if (availableSlots <= 0) {
				return interaction.editReply({
					content:
						'Your garden is completely full! Wait for plants to grow or upgrade your capacity in the shop.',
				})
			}

			const amountToPlant = Math.min(
				requestedAmount,
				seedCount,
				availableSlots,
			)

			let maxReadyTime = 0

			for (let i = 0; i < amountToPlant; i++) {
				const minTime = plantInfo.growTimeMin
				const maxTime = plantInfo.growTimeMax
				const randomGrowTime =
					Math.floor(Math.random() * (maxTime - minTime + 1)) +
					minTime

				const readyTime = Date.now() + randomGrowTime

				if (readyTime > maxReadyTime) {
					maxReadyTime = readyTime
				}

				const min = plantInfo.baseWeight - plantInfo.weightVariance
				const max = plantInfo.baseWeight + plantInfo.weightVariance
				const roundedWeight = Number(
					(Math.random() * (max - min) + min).toFixed(2),
				)

				const rolledVariantsName = getVariants()

				profile.activeGarden.push({
					plantName: seedName,
					readyAt: readyTime,
					weight: roundedWeight,
					variant: rolledVariantsName,
					isFavorited: false,
				})
			}

			const tracker = profile.tracking.plantPlants
			tracker.set(seedName, (tracker.get(seedName) || 0) + amountToPlant)
			tracker.set('total', (tracker.get('total') || 0) + amountToPlant)

			profile.seeds.set(seedName, seedCount - amountToPlant)

			profile.markModified('seeds')
			profile.markModified('tracking')

			await checkAchievements(profile)

			await profile.save()

			const discordTimestamp = Math.floor(maxReadyTime / 1000)
			let replyMessage = `You planted **${amountToPlant}x ${seedName}**! They will all be ready to harvest by <t:${discordTimestamp}:R>.`

			if (requestedAmount > amountToPlant) {
				if (amountToPlant === availableSlots) {
					replyMessage += `\n**(You only had ${availableSlots} empty garden slots left!)**`
				} else if (amountToPlant === seedCount) {
					replyMessage += `\n**(You only had ${seedCount} seeds!)**`
				}
			}

			await interaction.editReply({ content: replyMessage })
		} catch (err) {
			console.error('Error in /plant:', err)
			await interaction.editReply({
				content:
					'Something went wrong while trying to plant your seed.',
			})
		}
	},
}
