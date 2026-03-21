// Configuration
const DAY_ZERO_MS = 1774112400000 // Your Epoch anchor
const TIME_WARP_FACTOR = 60 // 1 hour becomes 1 minute (60x speed)

const getGameEpoch = () => {
	const realElapsed = Date.now() - DAY_ZERO_MS
	return realElapsed * TIME_WARP_FACTOR
}

const decodeGameEpoch = gameEpoch => {
	const msPerSecond = 1000
	const msPerMinute = msPerSecond * 60
	const msPerHour = msPerMinute * 60
	const msPerDay = msPerHour * 24

	// Use Math.abs for the breakdown logic to handle negative "pre-Day 0" times cleanly
	const absoluteMs = Math.abs(gameEpoch)

	const days = Math.floor(absoluteMs / msPerDay)
	const hours = Math.floor((absoluteMs % msPerDay) / msPerHour)
	const minutes = Math.floor((absoluteMs % msPerHour) / msPerMinute)
	const seconds = Math.floor((absoluteMs % msPerMinute) / msPerSecond)
	const millis = Math.floor(absoluteMs % msPerSecond)

	// isDay: Simple logic assuming 06:00 to 18:00 is daytime
	const isDay = hours >= 6 && hours < 18

	return {
		totalMs: gameEpoch,
		days: gameEpoch < 0 ? -days : days, // Keep the sign for the day count
		hours,
		minutes,
		seconds,
		millis,
		isDay,
		formatted: `Day ${days}, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
	}
}

module.exports = { getGameEpoch, decodeGameEpoch }
