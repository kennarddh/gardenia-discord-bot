const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserProfile = require("../../models/userProfile");
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');
const plantsData = require('../../data/plantsData'); // Adjust path to your plantsData if needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName("selltype")
        .setDescription("Sell all crops of a specific plant type.")
        .addStringOption(option => {
            option.setName('plant')
                .setDescription('Which type of plant to sell')
                .setRequired(true);
            
            // Add choices from your plantsData
            for (const plantName in plantsData) {
                option.addChoices({ name: plantName, value: plantName });
            }
            return option;
        }),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const profile = await UserProfile.findOne({ userId: interaction.user.id });
            
            if (!profile) {
                return sendNoProfileMessage(interaction);
            }

            if (!profile.inventory || profile.inventory.length === 0) {
                return interaction.editReply("You have no harvested crops to sell! Use `/garden` to grow more.");
            }

            const targetPlant = interaction.options.getString('plant');
            
            let earnings = 0;
            let soldCount = 0;
            const keptItems = [];

            for (const item of profile.inventory) {
                if (item.name === targetPlant) {
                    earnings += item.value;
                    soldCount++;
                } else {
                    keptItems.push(item);
                }
            }

            if (soldCount === 0) {
                return interaction.editReply(`You don't have any **${targetPlant}** crops in your inventory to sell.`);
            }

            earnings = Math.round(earnings);
            profile.bloomBuck += earnings;
            profile.inventory = keptItems;
            await profile.save();

            const embed = new EmbedBuilder()
                .setTitle(`${targetPlant}s Sold!`)
                .setColor("#2ECC71")
                .setDescription(`You sold **${soldCount}x** ${targetPlant}(s) for a total of 🪙 **${earnings}** BloomBucks!\n\nYour new balance is 🪙 **${Math.round(profile.bloomBuck)}**.`);

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("Error in /selltype command:", err);
            return interaction.editReply("Something went wrong while trying to sell your crops.");
        }
    },
};