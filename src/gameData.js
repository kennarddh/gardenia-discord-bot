
// Nest the object to trick the export system into allowing us to update the value inside this module and have it reflected in other modules that import it
const gameData = {
	lastWeatherEvent: null,
}

module.exports = { gameData }
