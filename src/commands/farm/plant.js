const { SlashCommandBuilder } = require('discord.js');
const UserProfile = require('../../models/userProfile');
const plantsData = require('../../data/plantsData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plant')
        .setDescription('Plant a seed in your garden.')
        .addStringOption(option => 
            option.setName('seed')
                  .setDescription('Which seed to plant')
                  .setRequired(true)
        ),

    async execute(interaction) {
        const profile = await UserProfile.findOne({ userId: interaction.user.id });

        const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');
        if (!profile) {
            return sendNoProfileMessage(interaction)
        }

        const seedName = interaction.options.getString('seed');
        const plantInfo = plantsData[seedName];

        if (!plantInfo) return interaction.reply({ content: "That seed doesn't exist!", ephemeral: true });

        const seedCount = profile.seeds.get(seedName) || 0;
        if (seedCount <= 0) return interaction.reply({ content: `You don't have any ${seedName} seeds! Buy them from the \`/shop\`.`, ephemeral: true });

        if (profile.activeGarden.length >= profile.maxSlots) {
            return interaction.reply({ content: "Your garden is full! Wait for plants to grow or upgrade your capacity.", ephemeral: true });
        }
        const readyTime = Date.now() + plantInfo.growTime;
        
        profile.seeds.set(seedName, seedCount - 1);
        profile.activeGarden.push({ plantName: seedName, readyAt: readyTime });
        await profile.save();

        const discordTimestamp = Math.floor(readyTime / 1000);
        
        await interaction.reply(`You planted a **${seedName}**! It will be ready to harvest <t:${discordTimestamp}:R>.`);
    }
};