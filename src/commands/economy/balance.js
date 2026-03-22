const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const UserProfile = require('../../models/userProfile')
// Move your require up here with the others!
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('balance')
		.setDescription('View your balance.')

		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('The user you want to view')
				.setRequired(false),
		),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			const targetUser =
				interaction.options.getUser('user') || interaction.user

			const profile = await UserProfile.findOne({ userId: targetUser.id })

			if (!profile) {
				return sendNoProfileMessage(interaction)
			}

			const embed = new EmbedBuilder()
				.setTitle(`${targetUser.username}'s Balance`)
				.setColor('#2ECC71')
				.setDescription(`**${profile.bloomBuck}** BloomBucks 💵`)

			await interaction.editReply({ embeds: [embed] })
		} catch (err) {
			console.error('Error in /balance command', err)
			await interaction.editReply(
				'Something went wrong while getting your balance.',
			)
		}
	},
}
