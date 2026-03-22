const { mutations, variants } = require('../constants/config')

function calculatePlantValue(
	mutation,
	weight,
	baseWeight,
	baseValue,
	variantName,
) {
	const cropValue = baseValue * Math.pow(weight / baseWeight, 2)

	let sum = 0
	let count = 0

	for (let m of mutation) {
		const foundMutation = mutations.find(x => x.name === m)
		if (foundMutation) {
			sum += foundMutation.multiplier
			count++
		}
	}

	let variantMultiplier = 1

	const foundVariant = variants.find(v => v.name === variantName)
	if (foundVariant) {
		variantMultiplier = foundVariant.multiplier
	}

	const totalMultiplier = variantMultiplier * (1 + (sum - count))

	const totalPrice = cropValue * totalMultiplier

	return totalPrice
}

module.exports = { calculatePlantValue }
