function sendNoProfileMessage(interaction) {
	interaction.editReply({
		content: "You don't have a garden yet! Use `/start` first.",
		ephemeral: true,
	})
}

module.exports = { sendNoProfileMessage }
