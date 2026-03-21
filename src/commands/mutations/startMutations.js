const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { startMutations } = require('../../utils/startMutations')
const config = require('../../constants/config')
const { isAdmin } = require('../../utils/isAdmin')  

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start-mutations')
		.setDescription('Start the mutation process for random garden slots')
		.addStringOption(option =>
			option
				.setName('mutation')
				.setDescription('The mutation to start')
				.setRequired(true)
				.addChoices(
					config.mutations.map(mutation => ({
						name: mutation.name,
						value: mutation.name,
					})),
				),
		),

	async execute(interaction) {
		if (!isAdmin(interaction.user.id)) {
			await interaction.reply({
				content: 'You do not have permission to use this command.',
				ephemeral: true,
			})

			return
		}

		const mutationName = interaction.options.getString('mutation')

		await interaction.deferReply()

		const mutation = config.mutations.find(m => m.name === mutationName)

		const result = await startMutations(mutation)

		if (!result) {
			const embed = new EmbedBuilder()
				.setTitle('Mutation Process Failed')
				.setDescription(
					'An error occurred while starting the mutation process. Please try again later.',
				)
				.setColor('#E74C3C')

			await interaction.editReply({ embeds: [embed] })

			return
		}

		const embed = new EmbedBuilder()
			.setTitle('Mutation Process Started')
			.setDescription(
				'The mutation process has been initiated for all active gardens. Check your garden to see the results!',
			)
			.addFields(
				{ name: 'Mutation', value: mutation.name, inline: true },
				{
					name: 'Affected Chance',
					value: `${mutation.affectedChance * 100}%`,
					inline: true,
				},
				{
					name: 'Occurance Weight',
					value: `${mutation.occuranceWeight}`,
					inline: true,
				},
				{
					name: 'Multiplier',
					value: `${mutation.multiplier}x`,
					inline: true,
				},
				{
					name: 'Total Eligible Slots',
					value: result.totalEligibleSlots.toString(),
					inline: true,
				},
				{
					name: 'Target Slots Count',
					value: result.targetCount.toString(),
					inline: true,
				},
			)
			.setColor('#9B59B6')

		await interaction.editReply({ embeds: [embed] })
	},
}
