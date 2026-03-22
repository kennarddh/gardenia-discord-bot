const { achivements } = require('../data/achivements')

const checkAchievements = async (profile, typeFilter = null) => {
	const newlyUnlocked = []

	// 1. Filter the master list based on the type we are currently updating
	// (If typeFilter is null, it checks EVERYTHING)
	const targets = typeFilter
		? achivements.filter(a => a.type === typeFilter)
		: achivements

	const normalAchievements = targets.filter(a => !a.isMeta)
	const metaAchievements = targets.filter(a => a.isMeta)

	for (const ach of normalAchievements) {
		// Skip if already completed
		if (profile.completedAchievements.includes(ach.id)) continue

		if (ach.type === 'plantPlants') {
			const trackCategory = profile.tracking.plantPlants

			if (ach.meta.plant === null) {
				if ((trackCategory.get('total') || 0) >= ach.meta.amount) {
					profile.completedAchievements.push(ach.id)
					newlyUnlocked.push(ach)
				}
			} else {
				if (
					(trackCategory.get(ach.meta.plant) || 0) >= ach.meta.amount
				) {
					profile.completedAchievements.push(ach.id)
					newlyUnlocked.push(ach)
				}
			}
		} else if (ach.type === 'harvestPlants') {
			const trackCategory = profile.tracking.harvestPlants

			if (ach.meta.plant === null) {
				if ((trackCategory.get('total') || 0) >= ach.meta.amount) {
					profile.completedAchievements.push(ach.id)
					newlyUnlocked.push(ach)
				}
			} else {
				if (
					(trackCategory.get(ach.meta.plant) || 0) >= ach.meta.amount
				) {
					profile.completedAchievements.push(ach.id)
					newlyUnlocked.push(ach)
				}
			}
		} else if (ach.type === 'sellCrops') {
			const trackCategory = profile.tracking.sellCrops

			if (ach.meta.plant === null) {
				if ((trackCategory.get('total') || 0) >= ach.meta.amount) {
					profile.completedAchievements.push(ach.id)
					newlyUnlocked.push(ach)
				}
			} else {
				if (
					(trackCategory.get(ach.meta.plant) || 0) >= ach.meta.amount
				) {
					profile.completedAchievements.push(ach.id)
					newlyUnlocked.push(ach)
				}
			}
		} else if (ach.type === 'buySeeds') {
			const trackCategory = profile.tracking.buySeeds

			if (ach.meta.plant === null) {
				if ((trackCategory.get('total') || 0) >= ach.meta.amount) {
					profile.completedAchievements.push(ach.id)
					newlyUnlocked.push(ach)
				}
			} else {
				if (
					(trackCategory.get(ach.meta.plant) || 0) >= ach.meta.amount
				) {
					profile.completedAchievements.push(ach.id)
					newlyUnlocked.push(ach)
				}
			}
		}
	}

	// 2. Check meta achievements
	for (const ach of metaAchievements) {
		// Skip if already completed
		if (profile.completedAchievements.includes(ach.id)) continue

		if (ach.type === 'completeAchivements') {
			if (profile.completedAchievements.length >= ach.meta.amount) {
				profile.completedAchievements.push(ach.id)
				newlyUnlocked.push(ach)
			}
		}
	}

	console.log({ newlyUnlocked })

	return newlyUnlocked
}

module.exports = { checkAchievements }
