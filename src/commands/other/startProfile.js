const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')
const { startingBloomBuck } = require('../../constants/config')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start')
		.setDescription('Start your farming journey and get your first seeds!'),

	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true })

		try {
			let profile = await UserProfile.findOne({
				userId: interaction.user.id,
			})

			if (profile) {
				return interaction.editReply({
					content:
						'You already have a garden! Use `/garden` to see it.',
				})
			}

			profile = new UserProfile({
				userId: interaction.user.id,
				bloomBuck: startingBloomBuck,
			})

			await profile.save()

			const embed = new EmbedBuilder()
				.setTitle('Welcome to your Garden!')
				.setColor('#2ECC71')
				.setDescription(
					`You have inherited a small plot of land!\n\nI have given you **${startingBloomBuck} BloomBucks** to get you started.`,
				)
				.addFields(
					{
						name: 'Step 1',
						value: 'Use `/plant seed:Wheat` to plant your first crop.',
					},
					{
						name: 'Step 2',
						value: 'Use `/garden` to check how much time is left.',
					},
					{
						name: 'Step 3',
						value: 'Use `/harvest` when they are ready!',
					},
				)

			await interaction.editReply({ embeds: [embed] })
		} catch (err) {
			console.error('Error in /start command:', err)
			await interaction.editReply({
				content:
					'Something went wrong with the database. Please try again later.',
			})
		}
	},
}
