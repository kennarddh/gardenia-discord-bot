function sendNoProfileMessage(interaction) {
    interaction.reply({ 
            content: "You don't have a garden yet! Use `/start` first.", 
            ephemeral: true 
    })
}

module.exports = { sendNoProfileMessage };