const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserProfile = require('../../models/userProfile');
const plantsData = require('../../data/plantsData');
const { getMutation } = require('../../utils/rng');
const { showNoProfileMessage } = require('../../constants/extraInformation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('harvest')
        .setDescription('Harvest all fully grown plants in your garden.'),

    async execute(interaction) {
        const profile = await UserProfile.findOne({ userId: interaction.user.id });

        if (!profile) {
             return interaction.reply({ 
                content: showNoProfileMessage, 
                ephemeral: true 
            });
        }

        if (profile.activeGarden.length === 0) {
            return interaction.reply({ content: "You have nothing planted in your garden!", ephemeral: true });
        }

        const now = Date.now();
        let harvestedCount = 0;
        let harvestResults = [];
        const newGarden = [];

        profile.activeGarden.forEach(plant => {
            if (now >= plant.readyAt) {
                harvestedCount++;
                const baseData = plantsData[plant.plantName];
                const mutation = getMutation();
                const finalValue = baseData.baseValue * mutation.multiplier;

                const existingItem = profile.inventory.find(item => 
                    item.name === plant.plantName && item.mutation === mutation.name
                );

                if (existingItem) {
                    existingItem.amount += 1;
                } else {
                    profile.inventory.push({
                        name: plant.plantName,
                        mutation: mutation.name,
                        value: finalValue, // value for one of the plant
                        amount: 1
                    });
                }
                
                harvestResults.push(`${mutation.name} **${plant.plantName}** (Worth 🪙 ${finalValue})`);
            } else {
                newGarden.push(plant);
            }
        });

        if (harvestedCount === 0) {
            return interaction.reply({ content: "None of your plants are ready to harvest yet!", ephemeral: true });
        }

        // save
        profile.activeGarden = newGarden;

        profile.markModified('inventory'); 
        
        await profile.save();

        const embed = new EmbedBuilder()
            .setTitle('Harvest Complete!')
            .setColor('#43B581')
            .setDescription(`You harvested ${harvestedCount} plants:\n\n` + harvestResults.join('\n'))
            .setFooter({ text: 'Use /sell to trade these for BloomBucks!' });

        await interaction.reply({ embeds: [embed] });
    }
};