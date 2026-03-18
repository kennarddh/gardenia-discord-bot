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
const { upgradeCost } = require("../../constants/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Open the interactive Bloom Shop to buy seeds and upgrades."),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const profile = await UserProfile.findOne({ userId: interaction.user.id });
            if (!profile) {
                return interaction.reply({ 
                    content: showNoProfileMessage, 
                    ephemeral: true 
                });
            }

            const plantsArray = Object.keys(plantsData).map(key => ({
                name: key,
                ...plantsData[key]
            }));

            const ITEMS_PER_PAGE = 3;
            const totalPages = Math.ceil(plantsArray.length / ITEMS_PER_PAGE);
            let currentPage = 0;

            const generateShopUI = () => {
                const start = currentPage * ITEMS_PER_PAGE;
                const currentItems = plantsArray.slice(start, start + ITEMS_PER_PAGE);

                const embed = new EmbedBuilder()
                    .setTitle("The Bloom Shop")
                    .setColor("#F1C40F")
                    .setDescription(`**Your Wallet:** 🪙 ${profile.bloomBuck} BloomBucks\n**Garden Slots:** ${profile.maxSlots}\n\n*Page ${currentPage + 1} of ${totalPages}*`)
                    .setFooter({ text: "Click a button below to purchase!" });

                currentItems.forEach(item => {
                    const growTimeMins = Math.round(item.growTime / 60000); 
                    embed.addFields({
                        name: `🌱 ${item.name} Seed`,
                        value: `**Cost:** 🪙 ${item.seedCost} | **Grows in:** ⏱️ ${growTimeMins}m\n*Sells for roughly 🪙 ${item.baseValue}*`,
                        inline: false
                    });
                });

                // buy buttons
                const buyRow = new ActionRowBuilder();
                currentItems.forEach(item => {
                    buyRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`buy_${item.name}`) // e.g., "buy_Wheat"
                            .setLabel(`Buy ${item.name}`)
                            .setStyle(ButtonStyle.Primary)
                    );
                });

                // navigation and ugprade buttons
                const navRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev")
                        .setEmoji("◀️")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),
                        
                    new ButtonBuilder()
                        .setCustomId("upgrade")
                        .setLabel(`Upgrade Garden (${upgradeCost})`)
                        .setStyle(ButtonStyle.Success),
                        
                    new ButtonBuilder()
                        .setCustomId("next")
                        .setEmoji("▶️")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage >= totalPages - 1)
                );

                return { embeds: [embed], components: [buyRow, navRow] };
            };

            const response = await interaction.editReply(generateShopUI());

            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 120000 
            });

            collector.on("collect", async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "This isn't your shop menu! Use `/shop` to open your own.", ephemeral: true });
                }

                if (i.customId === "prev") {
                    currentPage--;
                    await i.update(generateShopUI());
                    return;
                }
                
                if (i.customId === "next") {
                    currentPage++;
                    await i.update(generateShopUI());
                    return;
                }

                if (i.customId === "upgrade") {
                    if (profile.bloomBuck < upgradeCost) {
                        return i.reply({ content: `You need 🪙 **${upgradeCost}** to upgrade!`, ephemeral: true });
                    }
                    profile.bloomBuck -= upgradeCost;
                    profile.maxSlots += 1;
                    await profile.save();
                    
                    await i.update(generateShopUI()); 

                    await i.followUp({ content: `🏡 Upgraded! You now have **${profile.maxSlots}** slots.`, ephemeral: true });
                    return;
                }

                if (i.customId.startsWith("buy_")) {
                    const seedName = i.customId.split("_")[1]; 
                    const plantInfo = plantsData[seedName];

                    if (profile.bloomBuck < plantInfo.seedCost) {
                        return i.reply({ content: `You don't have enough BloomBucks to buy a **${seedName} Seed**!`, ephemeral: true });
                    }

                    profile.bloomBuck -= plantInfo.seedCost;
                    const currentSeeds = profile.seeds.get(seedName) || 0;
                    profile.seeds.set(seedName, currentSeeds + 1);
                    await profile.save();

                    await i.update(generateShopUI());
                    await i.followUp({ content: `Bought **1x ${seedName} Seed**!`, ephemeral: true });
                }
            });

            collector.on("end", async () => {
                const disabledUi = generateShopUI();
                disabledUi.components.forEach(row => {
                    row.components.forEach(button => button.setDisabled(true));
                });
            
                try {
                    await interaction.editReply({ 
                        embeds: disabledUi.embeds, 
                        components: disabledUi.components,
                        content: "*This shop session has expired. Use `/shop` again to buy more.*"
                    });
                } catch (err)
            });

        } catch (err) {
            console.error("Error in /shop command:", err);
            return interaction.editReply("Something went wrong while trying to open the shop.");
        }
    },
};