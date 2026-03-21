module.exports = {
	startingBloomBuck: 50,
	baseGardenSlots: 5,
	upgradeCost: 500,

	variants: [
		{ name: 'Normal', weight: 600, multiplier: 1 },
		{ name: 'Gold', weight: 100, multiplier: 2 },
		{ name: 'Shiny', weight: 50, multiplier: 5 },
		{ name: 'Withered', weight: 90, multiplier: 0.5 },
		{ name: 'Dead', weight: 10, multiplier: 0 },
	],

	mutations: [
		{ name: 'Wet', affectedChance: 0.9, occuranceWeight: 200, multiplier: 1.5 },
		{ name: 'Shocked', affectedChance: 0.3, occuranceWeight: 100, multiplier: 5 },
	],

    weatherEvents: {
        minummInterval:  10*60 * 1000, // 10 minutes
        maximumInterval:  20 * 60 * 1000, // 20 minutes
    }
}
