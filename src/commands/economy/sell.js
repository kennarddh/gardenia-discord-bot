const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserProfile = require("../../models/userProfile");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sell")
        .setDescription("Sell all your harvested crops for bloomBucks."),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const profile = await UserProfile.findOne({ userId: interaction.user.id });
            const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');
            if (!profile) {
                return sendNoProfileMessage(interaction)
            }

            if (profile.inventory.length === 0) {
                return interaction.editReply("You have no harvested crops to sell! Use `/harvest` first.");
            }

            let totalEarnings = 0;
            let soldItemsSummary = "";

            // total earnings
            profile.inventory.forEach(item => {
                const stackValue = item.value * item.amount;
                totalEarnings += stackValue;
                soldItemsSummary += `• **${item.amount}x** ${item.mutation} ${item.name} -> ${stackValue}\n`;
            });

            profile.bloomBuck += totalEarnings;
            profile.inventory = [];
            
            profile.markModified('inventory');
            await profile.save();

            const embed = new EmbedBuilder()
                .setTitle("Sale Complete!")
                .setColor("#2ECC71")
                .setDescription(`You sold all your crops and earned **${totalEarnings}**!\n\n**You now have a total of ${profile.bloomBuck}.**`)
                .addFields({ name: 'Sold Items', value: soldItemsSummary });

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("Error in /sell command:", err);
            return interaction.editReply("Something went wrong while trying to sell your crops. Please try again later.");
        }
    },
};