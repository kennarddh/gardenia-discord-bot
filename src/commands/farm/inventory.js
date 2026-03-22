const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} = require('discord.js')

const UserProfile = require('../../models/userProfile')
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('View all your harvested plants and mutations.')

		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('The user you want to view')
				.setRequired(false),
		),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			const targetUser =
				interaction.options.getUser('user') || interaction.user

			const profile = await UserProfile.findOne({ userId: targetUser.id })

			if (!profile) {
				return sendNoProfileMessage(interaction)
			}

			if (!profile.inventory || profile.inventory.length === 0) {
				const emptyEmbed = new EmbedBuilder()
					.setTitle(`${targetUser.username}'s Inventory`)
					.setColor('#E74C3C')
					.setDescription(
						'Your inventory is completely empty! Harvest some crops from your `/garden`.',
					)

				return interaction.editReply({ embeds: [emptyEmbed] })
			}

			const itemsPerPage = 5
			const totalPages = Math.ceil(
				profile.inventory.length / itemsPerPage,
			)
			let currentPage = 0

			const totalInventoryValue = Math.round(
				profile.inventory.reduce(
					(total, item) => total + item.value,
					0,
				),
			)

			const generateInventoryUI = () => {
				const start = currentPage * itemsPerPage
				const currentItems = profile.inventory.slice(
					start,
					start + itemsPerPage,
				)

				const embed = new EmbedBuilder()
					.setTitle(`${targetUser.username}'s Harvested Crops`)
					.setColor('#3498DB')
					.setDescription(
						`**Total Inventory Value:** 💵 ${totalInventoryValue} BloomBucks\n\n*Page ${currentPage + 1} of ${totalPages}*`,
					)

				currentItems.forEach((item, index) => {
					const itemIndex = start + index + 1

					let prefix = ''

					if (item.variant && item.variant !== 'Normal') {
						prefix += `${item.variant} `
					}

					if (item.mutation && item.mutation.length > 0) {
						prefix += `${item.mutation.join(' ')} `
					}

					const fieldName = `${itemIndex}. **${prefix}${item.name}** (${item.weight}kg)`

					const fieldValue = `**Sell Value:** 💵 ${Math.round(item.value)}`

					embed.addFields({
						name: fieldName,
						value: fieldValue,
						inline: false,
					})
				})

				const components = []
				if (totalPages > 1) {
					const navRow = new ActionRowBuilder().addComponents(
						new ButtonBuilder()
							.setCustomId('prev')
							.setEmoji('◀️')
							.setLabel('Previous')
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(currentPage === 0),

						new ButtonBuilder()
							.setCustomId('next')
							.setEmoji('▶️')
							.setLabel('Next')
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(currentPage >= totalPages - 1),
					)
					components.push(navRow)
				}

				return { embeds: [embed], components: components }
			}

			const response = await interaction.editReply(generateInventoryUI())

			if (totalPages > 1) {
				const collector = response.createMessageComponentCollector({
					componentType: ComponentType.Button,
					time: 60000,
				})

				collector.on('collect', async i => {
					if (i.user.id !== targetUser.id) {
						return i.reply({
							content:
								"You cannot click buttons on someone else's inventory!",
							ephemeral: true,
						})
					}

					if (i.customId === 'prev') {
						currentPage--
					} else if (i.customId === 'next') {
						currentPage++
					}
					await i.update(generateInventoryUI())
				})

				collector.on('end', async () => {
					const disabledUi = generateInventoryUI()
					disabledUi.components.forEach(row => {
						row.components.forEach(button =>
							button.setDisabled(true),
						)
					})

					try {
						await interaction.editReply({
							embeds: disabledUi.embeds,
							components: disabledUi.components,
						})
					} catch (err) {
						if (err.code !== 10008) {
							console.error(
								'Failed to disable inventory buttons:',
								err,
							)
						}
					}
				})
			}
		} catch (err) {
			console.error('Error in /inventory command:', err)
			return interaction.editReply(
				'Something went wrong while trying to open your inventory.',
			)
		}
	},
}
