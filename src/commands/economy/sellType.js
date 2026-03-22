const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')
const plantsData = require('../../data/plantsData') // Adjust path if needed
const { checkAchievements } = require('../../utils/checkAchievements')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('selltype')
		.setDescription('Sell all crops of a specific plant type.')
		.addStringOption(option => {
			option
				.setName('plant')
				.setDescription('Which type of plant to sell')
				.setRequired(true)

			for (const plantName in plantsData) {
				option.addChoices({ name: plantName, value: plantName })
			}
			return option
		}),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			const profile = await UserProfile.findOne({
				userId: interaction.user.id,
			})

			if (!profile) {
				return sendNoProfileMessage(interaction)
			}

			if (!profile.inventory || profile.inventory.length === 0) {
				return interaction.editReply(
					'You have no harvested crops to sell! Use `/garden` to grow more.',
				)
			}

			const targetPlant = interaction.options.getString('plant')

			let earnings = 0
			let soldCount = 0
			const keptItems = []

			for (const item of profile.inventory) {
				if (item.name === targetPlant && !item.isFavorited) {
					earnings += item.value
					soldCount++
				} else {
					keptItems.push(item)
				}
			}

			const tracker = profile.tracking.sellCrops

			tracker.set(
				targetPlant,
				(tracker.get(targetPlant) || 0) + soldCount,
			)
			tracker.set('total', (tracker.get('total') || 0) + soldCount)

			if (soldCount === 0) {
				const favoritedCount = profile.inventory.filter(
					item => item.name === targetPlant && item.isFavorited,
				).length
				if (favoritedCount > 0) {
					return interaction.editReply(
						`All your **${targetPlant}** crops are favorited. Unfavorite them first to sell.`,
					)
				}
				return interaction.editReply(
					`You don't have any **${targetPlant}** crops in your inventory to sell.`,
				)
			}

			earnings = Math.round(earnings)
			profile.bloomBuck += earnings
			profile.inventory = keptItems

			profile.markModified('tracking')

			await checkAchievements(profile)

			await profile.save()

			const embed = new EmbedBuilder()
				.setTitle(`${targetPlant}s Sold!`)
				.setColor('#2ECC71')
				.setDescription(
					`You sold **${soldCount}x** ${targetPlant}(s) for a total of 💵 **${earnings}** BloomBucks!\n\n` +
						`Your new balance is 💵 **${Math.round(profile.bloomBuck)}**.` +
						(profile.inventory.some(
							item =>
								item.name === targetPlant && item.isFavorited,
						)
							? `\n\n**Some ${targetPlant} crops were favorited and not sold.**`
							: ''),
				)

			return interaction.editReply({ embeds: [embed] })
		} catch (err) {
			console.error('Error in /selltype command:', err)
			return interaction.editReply(
				'Something went wrong while trying to sell your crops.',
			)
		}
	},
}
