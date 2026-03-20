const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserProfile = require("../../models/userProfile");
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sellall")
        .setDescription("Sell absolutely everything in your inventory."),

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

            const itemCount = profile.inventory.length;
            const totalEarnings = Math.round(profile.inventory.reduce((sum, item) => sum + item.value, 0));

            profile.bloomBuck += totalEarnings;
            profile.inventory = [];
            await profile.save();

            const embed = new EmbedBuilder()
                .setTitle("All Items Sold!")
                .setColor("#2ECC71")
                .setDescription(`You sold all **${itemCount}** items from your inventory for a total of 🪙 **${totalEarnings}** BloomBucks!\n\nYour new balance is 🪙 **${Math.round(profile.bloomBuck)}**.`);

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("Error in /sellall command:", err);
            return interaction.editReply("Something went wrong while trying to sell all your crops.");
        }
    },
};