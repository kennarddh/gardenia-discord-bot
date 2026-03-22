const { variants } = require('../constants/config')

function getVariants() {
	let totalWeight = 0
	for (const mutation of variants) {
		totalWeight += mutation.weight
	}

	let roll = Math.random() * totalWeight

	for (const mutation of variants) {
		if (roll < mutation.weight) {
			return mutation.name
		}
		roll -= mutation.weight
	}

	return variants[0].name
}

module.exports = { getVariants }
