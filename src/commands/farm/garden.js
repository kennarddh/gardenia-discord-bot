const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} = require('discord.js');
const UserProfile = require('../../models/userProfile');
const { sendNoProfileMessage } = require('../../utils/showNoProfileMessage');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('garden')
		.setDescription('View your plants in your garden.'),

	async execute(interaction) {
		await interaction.deferReply();

		try {
			const profile = await UserProfile.findOne({
				userId: interaction.user.id,
			});

			if (!profile) {
				return sendNoProfileMessage(interaction);
			}

			const itemsPerPage = 20;
			let currentPage = 0;

			const generateGardenUI = (page) => {
				const embed = new EmbedBuilder()
					.setTitle(`🏡 ${interaction.user.username}'s Garden`)
					.setColor('#2ECC71');

				const totalSlots = profile.maxSlots;
				const usedSlots = profile.activeGarden.length;

				let description = `Slots used: **${usedSlots} / ${totalSlots}**\n\n`;

				if (usedSlots === 0) {
					description += '*Your garden is completely empty. Use `/plant` to start growing!*';
					embed.setDescription(description);
					return { embeds: [embed], components: [] };
				}

				const totalPages = Math.ceil(usedSlots / itemsPerPage);
				const start = page * itemsPerPage;
				const currentPlants = profile.activeGarden.slice(start, start + itemsPerPage);

				let gardenText = '';

				currentPlants.forEach((plant, index) => {
					const globalIndex = start + index + 1;
					const timestamp = Math.floor(plant.readyAt / 1000);

					let prefix = '';
					if (plant.variant && plant.variant !== 'Normal') {
						prefix += `${plant.variant} `;
					}
					if (plant.mutation && plant.mutation.length > 0) {
						prefix += `${plant.mutation.join(' ')} `;
					}
					const plantDisplayName = `**${prefix}${plant.plantName}**`;

					if (Date.now() >= plant.readyAt) {
						gardenText += `${globalIndex}. ${plantDisplayName} - Ready to /harvest!\n`;
					} else {
						gardenText += `${globalIndex}. ${plantDisplayName} - Growing: <t:${timestamp}:R>\n`;
					}
				});

				embed.setDescription(description + gardenText);
				embed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });

				const row = new ActionRowBuilder();
				row.addComponents(
					new ButtonBuilder()
						.setCustomId('prev')
						.setEmoji({ id: '1485229572189589555', name: 'rightWhiteArrow' })
						.setStyle(ButtonStyle.Primary)
						.setDisabled(page === 0),
					new ButtonBuilder()
						.setCustomId('next')
						.setEmoji({ id: '1485228358575853689', name: 'whiteArrow' })
						.setStyle(ButtonStyle.Primary)
						.setDisabled(page >= totalPages - 1)
				);

				return { embeds: [embed], components: totalPages > 1 ? [row] : [] };
			};

			const response = await interaction.editReply(generateGardenUI(currentPage));

			if (profile.activeGarden.length <= itemsPerPage) return;

			const collector = response.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 120000,
			});

			collector.on('collect', async i => {
				if (i.user.id !== interaction.user.id) {
					return i.reply({ content: "This isn't your garden menu!", ephemeral: true });
				}

				if (i.customId === 'prev') currentPage--;
				if (i.customId === 'next') currentPage++;

				await i.update(generateGardenUI(currentPage));
			});

			collector.on('end', async () => {
				try {
					const disabledUi = generateGardenUI(currentPage);
					if (disabledUi.components.length > 0) {
						disabledUi.components[0].components.forEach(button => button.setDisabled(true));
						await interaction.editReply({ components: disabledUi.components });
					}
				} catch (err) {
					console.error('Error disabling buttons after collector ended:', err);
				}
			});

		} catch (error) {
			console.error('Error in /garden command:', error);
			await interaction.editReply('Something went wrong while trying to view your garden.');
		}
	},
};