const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('favorite')
		.setDescription(
			'Favorite or unfavorite a plant to protect it from being sold/harvested.',
		)
		.addStringOption(option =>
			option
				.setName('location')
				.setDescription('Where is the plant you want to favorite?')
				.setRequired(true)
				.addChoices(
					{ name: 'Inventory', value: 'inventory' },
					{ name: 'Garden', value: 'garden' },
				),
		)
		.addIntegerOption(option =>
			option
				.setName('index')
				.setDescription('The item index number')
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

			const location = interaction.options.getString('location')
			const userIndex = interaction.options.getInteger('index')
			const arrayIndex = userIndex - 1

			let targetArray = []
			let locationName = ''

			if (location === 'inventory') {
				targetArray = profile.inventory
				locationName = 'Inventory'
			} else if (location === 'garden') {
				targetArray = profile.activeGarden
				locationName = 'Garden'
			}

			if (!targetArray || targetArray.length === 0) {
				return interaction.editReply({
					content: `Your **${locationName}** is completely empty! You have nothing to favorite here.`,
				})
			}

			if (arrayIndex >= targetArray.length) {
				return interaction.editReply({
					content: `Invalid index! You only have **${targetArray.length}** items in your ${locationName}.`,
				})
			}

			const targetItem = targetArray[arrayIndex]

			targetItem.isFavorited = !targetItem.isFavorited

			if (location === 'inventory') {
				profile.markModified('inventory')
			} else {
				profile.markModified('activeGarden')
			}

			await profile.save()

			const baseName = targetItem.name || targetItem.plantName
			let prefix = ''

			if (targetItem.variant && targetItem.variant !== 'Normal')
				prefix += targetItem.variant + ' '
			if (targetItem.mutation && targetItem.mutation.length > 0)
				prefix += targetItem.mutation.join(' ') + ' '

			const itemDisplayName = `${prefix}**${baseName}**`

			const embed = new EmbedBuilder()
				.setTitle(
					targetItem.isFavorited
						? 'Item Favorited!'
						: 'item Unfavorited',
				)
				.setColor(targetItem.isFavorited ? '#E74C3C' : '#95A5A6')
				.setDescription(
					`You have successfully ${targetItem.isFavorited ? 'favorited' : 'unfavorited'} the ${itemDisplayName} (${targetItem.weight}kg) in your **${locationName}**!`,
				)

			await interaction.editReply({ embeds: [embed] })
		} catch (err) {
			console.error('Error in /favorite:', err)
			await interaction.editReply({
				content:
					'Something went wrong while trying to favorite your item.',
			})
		}
	},
}
