const isAdmin = userId => {
	const adminIds = process.env.ADMIN_DISCORD_USER_IDS.split(',').map(id =>
		id.trim(),
	)

	return adminIds.includes(userId)
}

module.exports = { isAdmin }
