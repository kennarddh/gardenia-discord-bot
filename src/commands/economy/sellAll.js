const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')
const { checkAchievements } = require('../../utils/checkAchievements')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sellall')
		.setDescription(
			'Sell all items in your inventory that are not favorited.',
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

			if (!profile.inventory || profile.inventory.length === 0) {
				return interaction.editReply(
					'You have no harvested crops to sell! Use `/garden` to grow more.',
				)
			}

			const sellableItems = profile.inventory.filter(
				item => !item.isFavorited,
			)
			const favoritedItems = profile.inventory.filter(
				item => item.isFavorited,
			)

			if (sellableItems.length === 0) {
				return interaction.editReply(
					'You have no items to sell because all items are favorited. Unfavorite some first!',
				)
			}

			const tracker = profile.tracking.sellCrops

			for (const item of sellableItems) {
				tracker.set(item.name, (tracker.get(item.name) || 0) + 1)
			}

			tracker.set(
				'total',
				(tracker.get('total') || 0) + sellableItems.length,
			)

			const totalEarnings = Math.round(
				sellableItems.reduce((sum, item) => sum + item.value, 0),
			)

			profile.bloomBuck += totalEarnings

			profile.inventory = favoritedItems

			profile.markModified('tracking')

			await checkAchievements(profile)

			await profile.save()

			const embed = new EmbedBuilder()
				.setTitle('Items Sold!')
				.setColor('#2ECC71')
				.setDescription(
					`You sold **${sellableItems.length}** items from your inventory for a total of 💵 **${totalEarnings}** BloomBucks!\n\n` +
						`Your new balance is 💵 **${Math.round(profile.bloomBuck)}**.` +
						(favoritedItems.length > 0
							? `\n\n**${favoritedItems.length} favorited item(s) were not sold.**`
							: ''),
				)

			return interaction.editReply({ embeds: [embed] })
		} catch (err) {
			console.error('Error in /sellall command:', err)
			return interaction.editReply(
				'Something went wrong while trying to sell your crops.',
			)
		}
	},
}
