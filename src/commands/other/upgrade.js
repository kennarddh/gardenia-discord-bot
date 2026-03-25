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
const upgrades = require('../../data/upgrades')

const activeTransactions = new Set(); 

module.exports = {
	data: new SlashCommandBuilder()
		.setName('upgrade')
		.setDescription('Browse and purchase permanent upgrades for your garden.'),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			const profile = await UserProfile.findOne({ userId: interaction.user.id })
			if (!profile) return sendNoProfileMessage(interaction)

			let currentPage = 0;

			const generateUpgradeUI = (profileData) => {
				const currentUpgrade = upgrades[currentPage];
				const userLevel = parseInt(profileData.upgrades.get(currentUpgrade.id), 10) || 0; 

				const totalPages = upgrades.length;

				const embed = new EmbedBuilder()
					.setTitle(`Upgrades: ${currentUpgrade.name}`)
					.setColor('#2b2d31')
					.setDescription(
						`**Your Wallet:** 💵 ${Math.round(profileData.bloomBuck)}\n\n${currentUpgrade.description}`
					)
                    .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` });

				if (userLevel >= currentUpgrade.maxLevel) {
					embed.addFields({
						name: 'Status',
						value: `**Level:** ${userLevel} (MAX)`,
					});
				} else {
                    const nextLevelCost = Math.round(currentUpgrade.cost(userLevel));
					embed.addFields(
						{ name: 'Current Level', value: `\`${userLevel}\``, inline: true },
						{ name: 'Next Level', value: `\`${userLevel + 1}\``, inline: true },
						{ name: 'Upgrade Cost', value: `💵 ${nextLevelCost.toLocaleString()}`, inline: false }
					);
				}

				const components = []
				const actionRow = new ActionRowBuilder();
                const navRow = new ActionRowBuilder();
                
                const upgradeCost = Math.round(currentUpgrade.cost(userLevel));
                actionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`buy_${currentUpgrade.id}`)
                        .setLabel(userLevel >= currentUpgrade.maxLevel ? 'Max Level Reached' : `Buy Upgrade (💵 ${upgradeCost.toLocaleString()})`)
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(userLevel >= currentUpgrade.maxLevel)
                );
                
				navRow.addComponents(
					new ButtonBuilder()
						.setCustomId('prev')
						.setEmoji({
							id: '1485229572189589555',
							name: 'rightWhiteArrow'
						})
						.setStyle(ButtonStyle.Primary)
						.setDisabled(currentPage === 0),
					new ButtonBuilder()
						.setCustomId('next')
						.setEmoji({
							id: '1485228358575853689',
							name: 'whiteArrow'
						})
						.setStyle(ButtonStyle.Primary)
						.setDisabled(currentPage >= totalPages - 1)
				);

				components.push(actionRow, navRow);
				return { embeds: [embed], components: components };
			}

			const response = await interaction.editReply(generateUpgradeUI(profile));

			const collector = response.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 120000,
			});

			collector.on('collect', async i => {
				if (i.user.id !== interaction.user.id) {
					return i.reply({ content: "This isn't your upgrade menu!", ephemeral: true });
				}

				if (i.customId === 'prev') {
                    const latestProfile = await UserProfile.findOne({ userId: i.user.id });
					currentPage--;
					return i.update(generateUpgradeUI(latestProfile));
				}

				if (i.customId === 'next') {
                    const latestProfile = await UserProfile.findOne({ userId: i.user.id });
					currentPage++;
					return i.update(generateUpgradeUI(latestProfile));
				}

				if (i.customId.startsWith('buy_')) {
                    if (activeTransactions.has(i.user.id)) {
                        return i.reply({ content: 'Processing your purchase, please wait...', ephemeral: true });
                    }
                    
                    activeTransactions.add(i.user.id);

                    try {
                        const latestProfile = await UserProfile.findOne({ userId: i.user.id });
                        const upgradeId = i.customId.replace('buy_', '');
                        const upgradeData = upgrades.find(u => u.id === upgradeId);
                        
                        const currentLevel = parseInt(latestProfile.upgrades.get(upgradeId), 10) || 0;
                        const cost = Math.round(upgradeData.cost(currentLevel));

                        if (latestProfile.bloomBuck < cost) {
                            return i.reply({ content: `You need 💵 ${cost} to buy this upgrade!`, ephemeral: true });
                        }
                        if (currentLevel >= upgradeData.maxLevel) {
                            return i.reply({ content: `You have already reached the max level for this upgrade.`, ephemeral: true });
                        }

                        latestProfile.bloomBuck -= cost;
                        latestProfile.upgrades.set(upgradeId, currentLevel + 1);

                        if (upgradeId === 'garden_slots') {
                            latestProfile.maxSlots = (latestProfile.maxSlots || 1) + 1; 
                        }

                        await latestProfile.save();
                        
                        await i.update(generateUpgradeUI(latestProfile));
                        return i.followUp({ content: `Successfully upgraded **${upgradeData.name}** to Level ${currentLevel + 1}!`, ephemeral: true });
                    } catch (error) {
                        console.error('Error during purchase:', error);
                        return i.reply({ content: 'An error occurred while processing your purchase.', ephemeral: true });
                    } finally {
                        activeTransactions.delete(i.user.id);
                    }
				}
			});

			collector.on('end', async () => {
				try {
                    const finalProfile = await UserProfile.findOne({ userId: interaction.user.id });
					const disabledUi = generateUpgradeUI(finalProfile);
					disabledUi.components.forEach(row => row.components.forEach(button => button.setDisabled(true)));
					await interaction.editReply({
						content: '*This upgrade session has expired.*',
						embeds: disabledUi.embeds,
						components: disabledUi.components,
					});
				} catch (err) {
					console.error('Error disabling buttons after collector ended:', err);
				}
			});
		} catch (err) {
			console.error('Error in /upgrade command:', err);
			return interaction.editReply('Something went wrong while opening the upgrade shop.');
		}
	},
}