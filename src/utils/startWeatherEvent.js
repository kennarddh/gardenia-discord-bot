const config = require('../constants/config')
const { startMutations } = require('./startMutations')
const { getGameEpoch } = require('./timeSystem')
const { gameData } = require('../gameData')

const startWeatherEvent = async () => {
	const weightSum = config.mutations.reduce(
		(sum, mutation) => sum + mutation.occuranceWeight,
		0,
	)

	const randomValue = Math.random() * weightSum
	let cumulativeWeight = 0
	let selectedMutation = null

	for (const mutation of config.mutations) {
		cumulativeWeight += mutation.occuranceWeight
		if (randomValue < cumulativeWeight) {
			selectedMutation = mutation
			break
		}
	}

	if (selectedMutation) {
		console.log(
			`Selected Mutation ${selectedMutation.name} for weather event.`,
		)

		gameData.lastWeatherEvent = {
			timestamp: getGameEpoch(),
			selectedMutation,
		}

		const result = await startMutations(selectedMutation)

		console.log(
			`Weather event "${selectedMutation.name}" affected ${result.targetCount} out of ${result.totalEligibleSlots} eligible garden slots.`,
		)
	} else {
		console.error(
			'No mutation selected. This should not happen if weights are set correctly.',
		)
	}
}

module.exports = { startWeatherEvent }
