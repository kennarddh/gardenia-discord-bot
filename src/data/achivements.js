const plantsData = require('./plantsData')

const achivementTypes = [
	'plantPlants',
	'harvestPlants',
	'sellCrops',
	'buySeeds',
	'completeAchivements',
]

const plantPlantsAmounts = [10, 50, 100, 500, 1000]
const harvestPlantsAmounts = [10, 50, 100, 500, 1000]
const sellCropsAmounts = [10, 50, 100, 500, 1000]
const buySeedsAmounts = [10, 50, 100, 500, 1000]
const completeAchivementsAmounts = [5, 10, 20, 50, 100]

const achivements = [
	...plantPlantsAmounts
		.map(amount => [
			...Object.keys(plantsData).map(plantName => ({
				id: `plant-specific-${plantName}-${amount}`,
				type: 'plantPlants',
				description: `Plant ${amount} of ${plantName} in your garden.`,
				meta: {
					plant: plantName,
					amount,
				},
			})),
			{
				id: `plant-any-${amount}`,
				type: 'plantPlants',
				description: `Plant ${amount} of any plant in your garden.`,
				meta: {
					plant: null,
					amount,
				},
			},
		])
		.flat(),
	...harvestPlantsAmounts
		.map(amount => [
			...Object.keys(plantsData).map(plantName => ({
				id: `harvest-specific-${plantName}-${amount}`,
				type: 'harvestPlants',
				description: `Harvest ${amount} of ${plantName} from your garden.`,
				meta: {
					plant: plantName,
					amount,
				},
			})),
			{
				id: `harvest-any-${amount}`,
				type: 'harvestPlants',
				description: `Harvest ${amount} of any plant from your garden.`,
				meta: {
					plant: null,
					amount,
				},
			},
		])
		.flat(),
	...sellCropsAmounts
		.map(amount => [
			...Object.keys(plantsData).map(plantName => ({
				id: `sell-crops-${plantName}-${amount}`,
				type: 'sellCrops',
				description: `Sell ${amount} of ${plantName} from your inventory.`,
				meta: {
					plant: plantName,
					amount,
				},
			})),
			{
				id: `sell-crops-any-${amount}`,
				type: 'sellCrops',
				description: `Sell ${amount} of any crop from your inventory.`,
				meta: {
					plant: null,
					amount,
				},
			},
		])
		.flat(),
	...buySeedsAmounts
		.map(amount => [
			...Object.keys(plantsData).map(plantName => ({
				id: `buy-seeds-${plantName}-${amount}`,
				type: 'buySeeds',
				description: `Buy ${amount} of ${plantName} seeds from the shop.`,
				meta: {
					plant: plantName,
					amount,
				},
			})),
			{
				id: `buy-seeds-any-${amount}`,
				type: 'buySeeds',
				description: `Buy ${amount} of any seeds from the shop.`,
				meta: {
					plant: null,
					amount,
				},
			},
		])
		.flat(),
	...completeAchivementsAmounts.map(amount => ({
		id: `complete-achivements-${amount}`,
		type: 'completeAchivements',
		description: `Complete ${amount} achivements.`,
		meta: {
			amount,
		},
	})),
]

module.exports = { achivementTypes, achivements }
