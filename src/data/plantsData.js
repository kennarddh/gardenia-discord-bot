const minute = 60 * 1000 // milliseconds

module.exports = {
	Wheat: {
		seedCost: 10,
		growTimeMin: 1 * minute,
		growTimeMax: 1.5 * minute,
		baseValue: 15,
		quantityMin: 6,
		quantityMax: 20,
		baseWeight: 1.0,
		weightVariance: 0.5,
		stockChance: 1.0,
	},

	Carrot: {
		seedCost: 20,
		growTimeMin: 3 * minute,
		growTimeMax: 5 * minute,
		baseValue: 35,
		quantityMin: 4,
		quantityMax: 15,
		baseWeight: 0.5,
		weightVariance: 0.3,
		stockChance: 0.8,
	},

	Tomato: {
		seedCost: 30,
		growTimeMin: 5 * minute,
		growTimeMax: 8 * minute,
		baseValue: 50,
		quantityMin: 3,
		quantityMax: 10,
		baseWeight: 0.65,
		weightVariance: 0.35,
		stockChance: 0.6,
	},

	Rose: {
		seedCost: 100,
		growTimeMin: 15 * minute,
		growTimeMax: 20 * minute,
		baseValue: 180,
		quantityMin: 1,
		quantityMax: 5,
		baseWeight: 0.2,
		weightVariance: 0.1,
		stockChance: 0.3,
	},

	Melon: {
		seedCost: 500,
		growTimeMin: 25 * minute,
		growTimeMax: 30 * minute,
		baseValue: 600,
		quantityMin: 1,
		quantityMax: 3,
		baseWeight: 8.5,
		weightVariance: 3.5,
		stockChance: 0.1,
	},
}
