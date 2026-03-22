const { Schema, model } = require('mongoose')
const {
	baseGardenSlots,
	startingBloomBuck,
	upgradeCost,
} = require('../constants/config')

const userProfileSchema = new Schema({
	userId: { type: String, required: true, unique: true },
	bloomBuck: { type: Number, default: startingBloomBuck },
	maxSlots: { type: Number, default: baseGardenSlots },
	currentUpgradeCost: { type: Number, default: upgradeCost },

	// { "Wheat": 123, "Tomato": 123 }
	seeds: { type: Map, of: Number, default: {} },

	// { plantName: "Wheat", readyAt: 123 }
	activeGarden: [
		{
			plantName: String,
			mutation: [String],
			variant: String,
			weight: Number,
			readyAt: Number,
			isFavorited: { type: Boolean, default: false },
		},
	],

	// { name: "Wheat", mutation: "Golden", value: 123, amount: 123 }
	inventory: [
		{
			name: String,
			mutation: [String],
			variant: String,
			value: Number,
			weight: Number,
			isFavorited: { type: Boolean, default: false },
		},
	],

	completedAchievements: {
		type: [String],
		default: [],
	},

	tracking: {
		plantPlants: {
			type: Map,
			of: Number,
			default: () => new Map([['total', 0]]),
		},
		harvestPlants: {
			type: Map,
			of: Number,
			default: () => new Map([['total', 0]]),
		},
		sellCrops: {
			type: Map,
			of: Number,
			default: () => new Map([['total', 0]]),
		},
		buySeeds: {
			type: Map,
			of: Number,
			default: () => new Map([['total', 0]]),
		},
	},
})

module.exports = model('UserProfile', userProfileSchema)
