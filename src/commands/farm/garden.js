const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserProfile = require('../../models/userProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('garden')
        .setDescription('View your currently growing plants.'),

    async execute(interaction) {
        const profile = await UserProfile.findOne({ userId: interaction.user.id });

        const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');
        if (!profile) {
            return sendNoProfileMessage(interaction)
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🏡 ${interaction.user.username}'s Garden`)
            .setColor('#2ECC71')
            .setDescription(`Slots used: **${profile.activeGarden.length} / ${profile.maxSlots}**\n\n`);

        if (profile.activeGarden.length === 0) {
            embed.setDescription(embed.data.description + "*Your garden is completely empty. Use `/plant` to start growing!*");
        } else {
            let gardenText = "";
            profile.activeGarden.forEach((plant, index) => {
                const timestamp = Math.floor(plant.readyAt / 1000);
                
                if (Date.now() >= plant.readyAt) {
                    gardenText += `${index + 1}. **${plant.plantName}** - Ready to /harvest!\n`;
                } else {
                    gardenText += `${index + 1}. **${plant.plantName}** - Growing: <t:${timestamp}:R>\n`;
                }
            });
            embed.setDescription(embed.data.description + gardenText);
        }

        await interaction.reply({ embeds: [embed] });
    }
};