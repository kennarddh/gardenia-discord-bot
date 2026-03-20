const { SlashCommandBuilder } = require('discord.js');
const UserProfile = require('../../models/userProfile');
const plantsData = require('../../data/plantsData');
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');
const { getVariants } = require('../../utils/getVariants')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plant')
        .setDescription('Plant a seed in your garden.')
        .addStringOption(option => {
            option.setName('seed')
                  .setDescription('Which seed to plant')
                  .setRequired(true);
            
            for (const plantName in plantsData) {
                option.addChoices({ name: plantName, value: plantName });
            }
            return option;
        }),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const profile = await UserProfile.findOne({ userId: interaction.user.id });

            if (!profile) {
                return sendNoProfileMessage(interaction);
            }

            const seedName = interaction.options.getString('seed');
            const plantInfo = plantsData[seedName];

            if (!plantInfo) {
                return interaction.editReply({ content: "That seed doesn't exist!" });
            }

            const seedCount = profile.seeds.get(seedName) || 0;
            if (seedCount <= 0) {
                return interaction.editReply({ content: `You don't have any **${seedName}** seeds! Buy them from the \`/shop\`.` });
            }

            if (profile.activeGarden.length >= profile.maxSlots) {
                return interaction.editReply({ content: "Your garden is full! Wait for plants to grow or upgrade your capacity in the shop." });
            }

            const minTime = plantInfo.growTimeMin;
            const maxTime = plantInfo.growTimeMax;
            const randomGrowTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
            
            const readyTime = Date.now() + randomGrowTime;
            
            const min = plantInfo.baseWeight - plantInfo.weightVariance;
            const max = plantInfo.baseWeight + plantInfo.weightVariance;

            const roundedWeight = Number((Math.random() * (max - min) + min).toFixed(2));

            const rolledVariantsName = getVariants();

            const variantsForDB = [];
            if (rolledVariantsName !== 'Normal') {
                variantsForDBForDB.push(rolledMutationName);
            }

            profile.seeds.set(seedName, seedCount - 1);
            profile.activeGarden.push({ 
                plantName: seedName,
                readyAt: readyTime,
                weight: roundedWeight,
                variant: variantsForDB 
            });
            
            await profile.save();

            const discordTimestamp = Math.floor(readyTime / 1000);
            await interaction.editReply(`You planted a **${seedName}**! It will be ready to harvest <t:${discordTimestamp}:R>.`);

        } catch (err) {
            console.error("Error in /plant:", err);
            await interaction.editReply({ content: "Something went wrong while trying to plant your seed." });
        }
    }
};