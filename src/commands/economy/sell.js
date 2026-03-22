const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')
const { checkAchievements } = require('../../utils/checkAchievements')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sell')
		.setDescription(
			'Sell a specific item from your inventory by its index number.',
		)
		.addIntegerOption(option =>
			option
				.setName('index')
				.setDescription(
					'The item number (e.g., 1, 2, 3...) from your /inventory',
				)
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

			if (!profile.inventory || profile.inventory.length === 0) {
				return interaction.editReply(
					'You have no harvested crops to sell! Use `/garden` to grow more.',
				)
			}

			const itemIndex = interaction.options.getInteger('index')
			const arrayIndex = itemIndex - 1

			if (arrayIndex < 0 || arrayIndex >= profile.inventory.length) {
				return interaction.editReply(
					`Invalid item index. You only have ${profile.inventory.length} items. Check \`/inventory\` for the correct number.`,
				)
			}

			const itemToSell = profile.inventory[arrayIndex]

			if (itemToSell.isFavorited) {
				return interaction.editReply(
					'You cannot sell this item because it is **favorited**. Unfavorite it first to sell.',
				)
			}

			const tracker = profile.tracking.sellCrops

			tracker.set(
				itemToSell.name,
				(tracker.get(itemToSell.name) || 0) + 1,
			)
			tracker.set('total', (tracker.get('total') || 0) + 1)

			const earnings = Math.round(itemToSell.value)

			profile.bloomBuck += earnings
			profile.inventory.splice(arrayIndex, 1)

			profile.markModified('tracking')

			await checkAchievements(profile)

			await profile.save()

			const mutationText =
				itemToSell.mutation.length > 0
					? itemToSell.mutation.join(' ') + ' '
					: ''
			const itemName = `${mutationText}${itemToSell.name} (${itemToSell.weight}kg)`

			const embed = new EmbedBuilder()
				.setTitle('Item Sold!')
				.setColor('#2ECC71')
				.setDescription(
					`You sold **${itemName}** for 💵 **${earnings}** BloomBucks!\n\nYour new balance is 💵 **${Math.round(profile.bloomBuck)}**.`,
				)

			return interaction.editReply({ embeds: [embed] })
		} catch (err) {
			console.error('Error in /sell command:', err)
			return interaction.editReply(
				'Something went wrong while trying to sell your crop.',
			)
		}
	},
}
