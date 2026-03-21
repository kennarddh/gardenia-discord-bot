const config = require('../constants/config')
const { startWeatherEvent } = require('../utils/startWeatherEvent')

const setupWeatherEventTimer = async () => {
	const overrideInterval = process.env.WEATHER_EVENT_INTERVAL_OVERRIDE

	const interval =
		overrideInterval !== undefined
			? parseInt(overrideInterval)
			: Math.random() *
					(config.weatherEvents.maximumInterval -
						config.weatherEvents.minummInterval) +
				config.weatherEvents.minummInterval

	console.log(
		`Setting up next weather event in ${Math.round(interval / 1000)} seconds.`,
	)

	setTimeout(async () => {
		await startWeatherEvent()

		await setupWeatherEventTimer()
	}, interval)
}

module.exports = { setupWeatherEventTimer }
