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
    StringSelectMenuBuilder, // Import the select menu builder
} = require('discord.js')
const { checkAchievements } = require('../../utils/checkAchievements')
const { processNewlyUnlockedAchievements } = require('../../utils/processNewlyUnlockedAchievements')

const UserProfile = require('../../models/userProfile')
const plantsData = require('../../data/plantsData')
const eggsData = require('../../data/eggsData') // Import your new egg data
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')

const shopData = {
    plants: {
        items: {},
        purchases: new Map(),
        nextRefresh: 0,
        refreshInterval: 5 * 60 * 1000 // 5 minutes
    },
    eggs: {
        items: {},
        purchases: new Map(),
        nextRefresh: 0,
        refreshInterval: 30 * 60 * 1000 // 30 minutes
    }
};

function refreshShopStock(type) {
    const config = shopData[type];
    const data = type === 'plants' ? plantsData : eggsData;

    config.items = {};
    config.purchases.clear();
    config.nextRefresh = Date.now() + config.refreshInterval;

    for (const [itemName, itemData] of Object.entries(data)) {
		if (Math.random() <= itemData.stockChance) {
			const maxQty = Math.floor(Math.random() * (itemData.quantityMax - itemData.quantityMin + 1)) + itemData.quantityMin;
			config.items[itemName] = maxQty;
		}
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shop')
		.setDescription('Open the interactive Bloom Shop to buy seeds and eggs.'),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			let userProfile = await UserProfile.findOne({ userId: interaction.user.id })
			if (!userProfile) return sendNoProfileMessage(interaction)

			if (Date.now() >= shopData.plants.nextRefresh) refreshShopStock('plants');
            if (Date.now() >= shopData.eggs.nextRefresh) refreshShopStock('eggs');

			const itemsPerPage = 5;
			let currentPage = 0;
            let currentView = 'plants';
            
            const getMyStock = (type, itemName) => {
                const config = shopData[type];
                if (!config.items[itemName]) return 0;
                const myBoughtAmount = config.purchases.get(interaction.user.id)?.[itemName] || 0;
                return config.items[itemName] - myBoughtAmount;
            };
            
			const generateShopUI = (profileData, view) => {
                const config = shopData[view];
                const data = view === 'plants' ? plantsData : eggsData;
                const refreshTimestamp = Math.floor(config.nextRefresh / 1000);
                
				const availableItems = Object.keys(data).map(key => ({
					name: key,
					personalStock: getMyStock(view, key),
					...data[key],
				}));

				const totalPages = Math.ceil(availableItems.length / itemsPerPage) || 1;
				const start = currentPage * itemsPerPage;
				const currentItems = availableItems.slice(start, start + itemsPerPage);

				const embed = new EmbedBuilder()
					.setTitle(`The Bloom Shop - ${view.charAt(0).toUpperCase() + view.slice(1)}`)
					.setColor('#2b2d31')
					.setDescription(
						`**Your Wallet:** 💵 ${Math.round(profileData.bloomBuck)}\n🔄 **Restocks:** <t:${refreshTimestamp}:R>\n\n*Page ${currentPage + 1} of ${totalPages}*`
					);
                
                if (view === 'plants') {
                    currentItems.forEach(item => {
                        const minMins = Math.round(item.growTimeMin / 60000);
                        const maxMins = Math.round(item.growTimeMax / 60000);
                        const stockStatus = item.personalStock > 0 ? ` ${item.personalStock} left in stock!` : `SOLD OUT`;
                        embed.addFields({
                            name: `🌱 ${item.name} Seed`,
                            value: `Cost: 💵 ${item.seedCost}\n${stockStatus}\n`,
                            inline: false,
                        });
                    });
                } else if (view === 'eggs') {
                    currentItems.forEach(item => {
                        const stockStatus = item.personalStock > 0 ? ` ${item.personalStock} left in stock!` : `SOLD OUT`;
                        embed.addFields({
                            name: `🥚 ${item.name}`,
                            value: `Cost: 💵 ${item.cost}\n${stockStatus}\n`,
                            inline: false,
                        });
                    });
                }


				const components = [];

				if (currentItems.length > 0) {
					const buyRow = new ActionRowBuilder();
					currentItems.forEach(item => {
						buyRow.addComponents(
							new ButtonBuilder()
								.setCustomId(`buy_${view}_${item.name}`)
								.setLabel(item.personalStock > 0 ? `Buy ${item.name}` : 'Sold Out')
								.setStyle(ButtonStyle.Secondary)
								.setDisabled(item.personalStock <= 0),
						);
					});
					components.push(buyRow);
				}
                
                const navRow = new ActionRowBuilder();
				navRow.addComponents(
					new ButtonBuilder().setCustomId('prev').setEmoji({ id: '1485229572189589555' }).setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
					new ButtonBuilder().setCustomId('next').setEmoji({ id: '1485228358575853689' }).setStyle(ButtonStyle.Primary).setDisabled(currentPage >= totalPages - 1),
				);
				
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('shop_view_select')
                    .setPlaceholder('Change Shop View')
                    .addOptions(
                        { label: 'Plant Seeds', description: 'Buy seeds for your garden.', value: 'plants' },
                        { label: 'Pet Eggs', description: 'Buy eggs to hatch new pets.', value: 'eggs' }
                    );
                
                const menuRow = new ActionRowBuilder().addComponents(selectMenu);
                
                components.push(navRow, menuRow);

				return { embeds: [embed], components: components };
			};
            
			const response = await interaction.editReply(generateShopUI(userProfile, currentView))
            
			const collectorTime = Math.min(shopData.plants.nextRefresh, shopData.eggs.nextRefresh) - Date.now();

			const collector = response.createMessageComponentCollector({
				time: collectorTime > 0 ? collectorTime : 60000,
			})

			collector.on('collect', async i => {
				if (i.user.id !== interaction.user.id) {
					return i.reply({ content: "This isn't your shop menu!", ephemeral: true, })
				}

                userProfile = await UserProfile.findOne({ userId: i.user.id });

                if (i.isStringSelectMenu()) {
                    const selectedView = i.values[0];
                    if (selectedView !== currentView) {
                        currentView = selectedView;
                        currentPage = 0;
                    }
                    return i.update(generateShopUI(userProfile, currentView));
                }

				if (Date.now() >= shopData[currentView].nextRefresh) {
					refreshShopStock(currentView);
					currentPage = 0
					await i.update(generateShopUI(userProfile, currentView))
					return i.followUp({ content: `The ${currentView} shop just restocked!`, ephemeral: true, })
				}

				if (i.customId === 'prev') {
					currentPage--;
					return i.update(generateShopUI(userProfile, currentView));
				}

				if (i.customId === 'next') {
					currentPage++;
					return i.update(generateShopUI(userProfile, currentView));
				}

				if (i.customId.startsWith('buy_')) {
                    const [, type, itemName] = i.customId.split('_');
					const itemData = type === 'plants' ? plantsData[itemName] : eggsData[itemName];
					
                    if (type === 'plants') {
                        const myInitialStock = getMyStock('plants', itemName);
                        if (myInitialStock <= 0) return i.reply({ content: `Sold out!`, ephemeral: true });
                    } else if (type === 'eggs') {
                        const myInitialStock = getMyStock('eggs', itemName);
                        if (myInitialStock <= 0) return i.reply({ content: `Sold out!`, ephemeral: true });
                        
                        const totalCost = itemData.cost;
						if (userProfile.bloomBuck < totalCost) {
							return i.reply({ content: `You need 💵 **${totalCost}** to buy a ${itemName}!`, ephemeral: true, })
						}
                        
                        userProfile.bloomBuck -= totalCost;

						if (!userProfile.eggs) userProfile.eggs = [];

						userProfile.eggs.push({
    						name: itemName
						});

						await userProfile.save();

                        const config = shopData.eggs;
                        const userHistory = config.purchases.get(interaction.user.id) || {};
						userHistory[itemName] = (userHistory[itemName] || 0) + 1;
						config.purchases.set(interaction.user.id, userHistory);

                        await i.update(generateShopUI(userProfile, currentView));
                        return i.followUp({ content: `Bought **1x ${itemName}** for 💵 **${totalCost}**!`, ephemeral: true, })
                    }
				}
			});

			collector.on('end', async () => {
				try {
					const finalProfile = await UserProfile.findOne({ userId: interaction.user.id });
                    const disabledUi = generateShopUI(finalProfile, currentView);
					disabledUi.components.forEach(row => row.components.forEach(comp => comp.setDisabled(true)))
					await interaction.editReply({ embeds: disabledUi.embeds, components: disabledUi.components, content: '*This shop session has expired.*' })
				} catch (err) {
					console.error('Error disabling shop UI after collector ended:', err)
				}
			});
		} catch (err) {
			console.error('Error in /shop command:', err)
			return interaction.editReply('Something went wrong while trying to open the shop.')
		}
	},
}