const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require("discord.js");

const UserProfile = require("../../models/userProfile");
const plantsData = require("../../data/plantsData");
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');

let globalShopItems = {};
let playerPurchases = new Map();
let nextRefreshTime = 0;

function refreshShopStock() {
    globalShopItems = {};
    playerPurchases.clear();
    nextRefreshTime = Date.now() + (5 * 60 * 1000);

    for (const [plantName, data] of Object.entries(plantsData)) {
        if (Math.random() <= data.stockChance) {
            const maxQty = Math.floor(Math.random() * (data.quantityMax - data.quantityMin + 1)) + data.quantityMin;
            globalShopItems[plantName] = maxQty;
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Open the interactive Bloom Shop to buy seeds and upgrades."),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const profile = await UserProfile.findOne({ userId: interaction.user.id });
            if (!profile) return sendNoProfileMessage(interaction);

            if (Date.now() >= nextRefreshTime) {
                refreshShopStock();
            }

            const itemsPerPage = 5; 
            let currentPage = 0;

            const getMyStock = (plantName) => {
                if (!globalShopItems[plantName]) return 0;
                const myBoughtAmount = playerPurchases.get(interaction.user.id)?.[plantName] || 0;
                return globalShopItems[plantName] - myBoughtAmount;
            };

            const generateShopUI = () => {
                const availablePlants = Object.keys(globalShopItems).map(key => ({
                    name: key,
                    personalStock: getMyStock(key), 
                    ...plantsData[key]
                }));

                const totalPages = Math.ceil(availablePlants.length / itemsPerPage) || 1;
                const start = currentPage * itemsPerPage;
                const currentItems = availablePlants.slice(start, start + itemsPerPage);

                const liveUpgradeCost = profile.currentUpgradeCost || 500;
                const refreshTimestamp = Math.floor(nextRefreshTime / 1000);

                const embed = new EmbedBuilder()
                    .setTitle("🏪 The Bloom Shop")
                    .setColor("#F1C40F")
                    .setDescription(`**Your Wallet:** 🪙 ${profile.bloomBuck}\n**Garden Slots:** ${profile.maxSlots}\n🔄 **Restocks:** <t:${refreshTimestamp}:R>\n\n*Page ${currentPage + 1} of ${totalPages}*`);

                if (currentItems.length === 0) {
                    embed.addFields({ name: "Sold Out!", value: "The shop is completely empty right now. Check back later!" });
                }

                currentItems.forEach(item => {
                    const minMins = Math.round(item.growTimeMin / 60000); 
                    const maxMins = Math.round(item.growTimeMax / 60000); 
                    const stockStatus = item.personalStock > 0 ? `📦 **${item.personalStock} left in stock!**` : `❌ **SOLD OUT**`;

                    embed.addFields({
                        name: `🌱 ${item.name} Seed`,
                        value: `**Cost:** 🪙 ${item.seedCost}\n**Grows in:** ⏱️ ${minMins}-${maxMins}m\n${stockStatus}`,
                        inline: false
                    });
                });

                const buyRow = new ActionRowBuilder();
                currentItems.forEach(item => {
                    buyRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`buy_${item.name}`)
                            .setLabel(item.personalStock > 0 ? `Buy ${item.name}` : "Sold Out")
                            .setStyle(item.personalStock > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                            .setDisabled(item.personalStock <= 0)
                    );
                });

                const navRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev")
                        .setEmoji("◀️")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),
                        
                    new ButtonBuilder()
                        .setCustomId("upgrade")
                        .setLabel(`Upgrade Garden (🪙 ${liveUpgradeCost})`)
                        .setStyle(ButtonStyle.Success),
                        
                    new ButtonBuilder()
                        .setCustomId("next")
                        .setEmoji("▶️")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage >= totalPages - 1)
                );

                const components = currentItems.length > 0 ? [buyRow, navRow] : [navRow];
                return { embeds: [embed], components: components };
            };

            const response = await interaction.editReply(generateShopUI());

            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 120000 
            });

            collector.on("collect", async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "This isn't your shop menu!", ephemeral: true });
                }

                if (Date.now() >= nextRefreshTime) {
                    refreshShopStock();
                    currentPage = 0; 
                    await i.update(generateShopUI());
                    return i.followUp({ content: "🔄 The shop just restocked! Prices and stock have changed.", ephemeral: true });
                }

                if (i.customId === "prev") {
                    currentPage--;
                    return i.update(generateShopUI());
                }
                
                if (i.customId === "next") {
                    currentPage++;
                    return i.update(generateShopUI());
                }

                if (i.customId === "upgrade") {
                    const currentCost = profile.currentUpgradeCost || 500;

                    if (profile.bloomBuck < currentCost) {
                        return i.reply({ content: `You need 🪙 **${currentCost}** to upgrade!`, ephemeral: true });
                    }

                    profile.bloomBuck -= currentCost;
                    profile.maxSlots += 1;
                    profile.currentUpgradeCost = Math.floor(currentCost * 1.5);
                    await profile.save();
                    
                    await i.update(generateShopUI()); 
                    return i.followUp({ content: `🏡 Upgraded! You now have **${profile.maxSlots}** slots.`, ephemeral: true });
                }

                if (i.customId.startsWith("buy_")) {
                    const seedName = i.customId.split("_")[1]; 
                    const plantInfo = plantsData[seedName];

                    const myStock = getMyStock(seedName);
                    if (myStock <= 0) {
                        await i.update(generateShopUI());
                        return i.followUp({ content: `You have bought your entire allowance of **${seedName} Seeds** for this rotation! Wait for the restock.`, ephemeral: true });
                    }

                    if (profile.bloomBuck < plantInfo.seedCost) {
                        return i.reply({ content: `You don't have enough BloomBucks!`, ephemeral: true });
                    }

                    profile.bloomBuck -= plantInfo.seedCost;
                    const currentSeeds = profile.seeds.get(seedName) || 0;
                    profile.seeds.set(seedName, currentSeeds + 1);
                    await profile.save();

                    const userHistory = playerPurchases.get(interaction.user.id) || {};
                    userHistory[seedName] = (userHistory[seedName] || 0) + 1;
                    playerPurchases.set(interaction.user.id, userHistory);

                    await i.update(generateShopUI());
                    return i.followUp({ content: `🛍️ Bought **1x ${seedName} Seed**!`, ephemeral: true });
                }
            });

            collector.on("end", async () => {
                try {
                    const disabledUi = generateShopUI();
                    disabledUi.components.forEach(row => row.components.forEach(button => button.setDisabled(true)));
                    await interaction.editReply({ 
                        embeds: disabledUi.embeds, 
                        components: disabledUi.components,
                        content: "*This shop session has expired.*"
                    });
                } catch (err) {}
            });

        } catch (err) {
            console.error("Error in /shop command:", err);
            return interaction.editReply("Something went wrong while trying to open the shop.");
        }
    },
};