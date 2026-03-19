const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserProfile = require('../../models/userProfile');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View everything about your seeds, active garden, etc'),

    async execute(interaction) {
        const profile = await UserProfile.findOne({ userId: interaction.user.id });
        
        const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');
        if (!profile) {
            return sendNoProfileMessage(interaction)
        }

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s Profile`)
            .setColor('#F1C40F')
            .setThumbnail(interaction.user.displayAvatarURL());

        // bloombucks and garden capacity
        const statsText = `**BloomBuck:** ${profile.bloomBuck}\n**Garden Space:** ${profile.activeGarden.length} / ${profile.maxSlots} slots used`;
        embed.addFields({ name: 'Player Stats', value: statsText, inline: false });

        // seeds (what they can plant)
        let seedsText = '';
        let hasSeeds = false;

        for (const [seedName, amount] of profile.seeds.entries()) {
            if (amount > 0) {
                seedsText += `• **${amount}x** ${seedName} Seed\n`;
                hasSeeds = true;
            }
        }
        
        if (!hasSeeds) seedsText = '*No seeds. Buy some from the `/shop`!*';
        embed.addFields({ name: 'Your Seeds', value: seedsText, inline: false });

        // active garden (what is currently growing)
        let gardenText = '';
        
        if (profile.activeGarden.length === 0) {
            gardenText = '*Your garden is empty. Use `/plant`!*';
        } else {
            profile.activeGarden.forEach((plant, index) => {
                const readyTimestamp = Math.floor(plant.readyAt / 1000);
                
                // check if it's done growing
                if (Date.now() >= plant.readyAt) {
                    gardenText += `**${index + 1}.** **${plant.plantName}** - Ready to \`/harvest\`!\n`;
                } else {
                    gardenText += `**${index + 1}.** **${plant.plantName}** - Ready <t:${readyTimestamp}:R>\n`;
                }
            });
        }
        embed.addFields({ name: 'Active Garden', value: gardenText, inline: false });

        

        await interaction.reply({ embeds: [embed] });
    }
};