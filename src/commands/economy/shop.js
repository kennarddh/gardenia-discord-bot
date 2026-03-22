const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js')
const { checkAchievements } = require('../../utils/checkAchievements')

const UserProfile = require('../../models/userProfile')
const plantsData = require('../../data/plantsData')
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')

let globalShopItems = {}
let playerPurchases = new Map()
let nextRefreshTime = 0

function refreshShopStock() {
	globalShopItems = {}
	playerPurchases.clear()

	nextRefreshTime = Date.now() + 5 * 60 * 1000 // 5 minutes

	for (const [plantName, data] of Object.entries(plantsData)) {
		if (Math.random() <= data.stockChance) {
			const maxQty =
				Math.floor(
					Math.random() * (data.quantityMax - data.quantityMin + 1),
				) + data.quantityMin
			globalShopItems[plantName] = maxQty
		}
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shop')
		.setDescription(
			'Open the interactive Bloom Shop to buy seeds and upgrades.',
		),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			const profile = await UserProfile.findOne({
				userId: interaction.user.id,
			})
			if (!profile) return sendNoProfileMessage(interaction)

			if (Date.now() >= nextRefreshTime) {
				refreshShopStock()
			}

			const timeLeft = nextRefreshTime - Date.now()

			const itemsPerPage = 6
			let currentPage = 0

			const getMyStock = plantName => {
				if (!globalShopItems[plantName]) return 0
				const myBoughtAmount =
					playerPurchases.get(interaction.user.id)?.[plantName] || 0
				return globalShopItems[plantName] - myBoughtAmount
			}

			const generateShopUI = () => {
				const availablePlants = Object.keys(plantsData).map(key => ({
					name: key,
					personalStock: getMyStock(key),
					...plantsData[key],
				}))

				const totalPages =
					Math.ceil(availablePlants.length / itemsPerPage) || 1
				const start = currentPage * itemsPerPage
				const currentItems = availablePlants.slice(
					start,
					start + itemsPerPage,
				)

				const liveUpgradeCost = profile.currentUpgradeCost || 500
				const refreshTimestamp = Math.floor(nextRefreshTime / 1000)

				const embed = new EmbedBuilder()
					.setTitle('The Bloom Shop')
					.setColor('#F1C40F')
					.setDescription(
						`**Your Wallet:** 💵 ${Math.round(profile.bloomBuck)}\n**Garden Slots:** ${profile.maxSlots}\n🔄 **Restocks:** <t:${refreshTimestamp}:R>\n\n*Page ${currentPage + 1} of ${totalPages}*`,
					)

				currentItems.forEach(item => {
					const minMins = Math.round(item.growTimeMin / 60000)
					const maxMins = Math.round(item.growTimeMax / 60000)
					const stockStatus =
						item.personalStock > 0
							? ` **${item.personalStock} left in stock!**`
							: `**SOLD OUT**`

					embed.addFields({
						name: `🌱 ${item.name} Seed`,
						value: `**Cost:** 💵 ${item.seedCost}\n**Grows in:** ⏱${minMins}-${maxMins}m\n${stockStatus}`,
						inline: true,
					})
				})

				const buyRow = new ActionRowBuilder()
				const navRow = new ActionRowBuilder()
				const components = []

				if (currentItems.length > 0) {
					let currentRow = new ActionRowBuilder()
					currentItems.forEach((item, index) => {
						if (index > 0 && index % 5 === 0) {
							components.push(currentRow)
							currentRow = new ActionRowBuilder()
						}
						currentRow.addComponents(
							new ButtonBuilder()
								.setCustomId(`buy_${item.name}`)
								.setLabel(
									item.personalStock > 0
										? `Buy ${item.name}`
										: 'Sold Out',
								)
								.setStyle(
									item.personalStock > 0
										? ButtonStyle.Primary
										: ButtonStyle.Secondary,
								)
								.setDisabled(item.personalStock <= 0),
						)
					})
					components.push(currentRow)
				}

				navRow.addComponents(
					new ButtonBuilder()
						.setCustomId('prev')
						.setEmoji('◀️')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentPage === 0),

					new ButtonBuilder()
						.setCustomId('upgrade')
						.setLabel(`Upgrade Garden (💵 ${liveUpgradeCost})`)
						.setStyle(ButtonStyle.Success),

					new ButtonBuilder()
						.setCustomId('next')
						.setEmoji('▶️')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentPage >= totalPages - 1),
				)

				components.push(navRow)

				return { embeds: [embed], components: components }
			}

			const response = await interaction.editReply(generateShopUI())

			const collector = response.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: timeLeft,
			})

			collector.on('collect', async i => {
				if (i.user.id !== interaction.user.id) {
					return i.reply({
						content: "This isn't your shop menu!",
						ephemeral: true,
					})
				}

				if (Date.now() >= nextRefreshTime) {
					refreshShopStock()
					currentPage = 0
					await i.update(generateShopUI())
					return i.followUp({
						content:
							'The shop just restocked! Prices and stock have changed.',
						ephemeral: true,
					})
				}

				if (i.customId === 'prev') {
					currentPage--
					return i.update(generateShopUI())
				}

				if (i.customId === 'next') {
					currentPage++
					return i.update(generateShopUI())
				}

				if (i.customId === 'upgrade') {
					const currentCost = profile.currentUpgradeCost || 500

					if (profile.bloomBuck < currentCost) {
						return i.reply({
							content: `You need 💵 **${currentCost}** to upgrade!`,
							ephemeral: true,
						})
					}

					profile.bloomBuck -= currentCost
					profile.maxSlots += 1
					profile.currentUpgradeCost = Math.floor(currentCost * 1.5)
					await profile.save()

					await i.update(generateShopUI())
					return i.followUp({
						content: `Upgraded! You now have **${profile.maxSlots}** slots.`,
						ephemeral: true,
					})
				}

				if (i.customId.startsWith('buy_')) {
					const seedName = i.customId.split('_')[1]
					const plantInfo = plantsData[seedName]
					const myInitialStock = getMyStock(seedName)

					if (myInitialStock <= 0) {
						return i.reply({
							content: `You have bought your entire allowance of **${seedName} Seeds**! Wait for the restock.`,
							ephemeral: true,
						})
					}

					const modalId = `buy_modal_${seedName}`
					const modal = new ModalBuilder()
						.setCustomId(modalId)
						.setTitle(`Buying ${seedName} Seeds`)

					const amountInput = new TextInputBuilder()
						.setCustomId('amount_input')
						.setLabel(`How many? (Max: ${myInitialStock})`)
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
						.setPlaceholder('Enter a number...')
						.setMinLength(1)
						.setMaxLength(4)

					const actionRow = new ActionRowBuilder().addComponents(
						amountInput,
					)
					modal.addComponents(actionRow)

					await i.showModal(modal)

					try {
						const modalSubmit = await i.awaitModalSubmit({
							filter: mi =>
								mi.customId === modalId &&
								mi.user.id === interaction.user.id,
							time: 60000,
						})

						if (Date.now() >= nextRefreshTime) {
							return modalSubmit.reply({
								content:
									'The shop restocked while you were deciding! Please check the new stock.',
								ephemeral: true,
							})
						}

						const amountStr =
							modalSubmit.fields.getTextInputValue('amount_input')
						const amount = parseInt(amountStr, 10)

						if (isNaN(amount) || amount <= 0) {
							return modalSubmit.reply({
								content:
									'That is not a valid number! Please try again.',
								ephemeral: true,
							})
						}

						const currentStock = getMyStock(seedName)

						if (amount > currentStock) {
							return modalSubmit.reply({
								content: `You can't buy that many! You can only buy up to **${currentStock}**.`,
								ephemeral: true,
							})
						}

						const totalCost = plantInfo.seedCost * amount
						if (profile.bloomBuck < totalCost) {
							return modalSubmit.reply({
								content: `You need 💵 **${totalCost}** to buy ${amount}x ${seedName} seeds!`,
								ephemeral: true,
							})
						}

						const tracker = profile.tracking.buySeeds

						tracker.set(
							seedName,
							(tracker.get(seedName) || 0) + amount,
						)
						tracker.set(
							'total',
							(tracker.get('total') || 0) + amount,
						)

						profile.bloomBuck -= totalCost
						const currentSeeds = profile.seeds.get(seedName) || 0
						profile.seeds.set(seedName, currentSeeds + amount)

						profile.markModified('tracking')

						await checkAchievements(profile)

						await profile.save()

						const userHistory =
							playerPurchases.get(interaction.user.id) || {}
						userHistory[seedName] =
							(userHistory[seedName] || 0) + amount
						playerPurchases.set(interaction.user.id, userHistory)

						await modalSubmit.update(generateShopUI())

						return modalSubmit.followUp({
							content: `Bought **${amount}x ${seedName} Seed(s)** for 💵 **${totalCost}**!`,
							ephemeral: true,
						})
					} catch (error) {
						console.error('Error handling purchase modal:', error)
						return i.followUp({
							content:
								'An error occurred while processing your purchase.',
							ephemeral: true,
						})
					}
				}
			})

			collector.on('end', async (collected, reason) => {
				try {
					const disabledUi = generateShopUI()
					disabledUi.components.forEach(row =>
						row.components.forEach(button =>
							button.setDisabled(true),
						),
					)

					let endMessage = '*This shop session has expired.*'
					if (reason === 'time') {
						endMessage =
							'**The shop just restocked! Please run `/shop` again to see the new stock.**'
					}

					await interaction.editReply({
						embeds: disabledUi.embeds,
						components: disabledUi.components,
						content: endMessage,
					})
				} catch (err) {}
			})
		} catch (err) {
			console.error('Error in /shop command:', err)
			return interaction.editReply(
				'Something went wrong while trying to open the shop.',
			)
		}
	},
}
