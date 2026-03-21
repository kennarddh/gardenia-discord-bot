const UserProfile = require('../models/userProfile')
const startMutations = async mutation => {
	try {
		// 1. Get the count of EVERY individual garden slot that isn't "Wet"
		// We MUST unwind here to count the slots, not the users.
		const countResult = await UserProfile.aggregate([
			{ $unwind: '$activeGarden' },
			{ $match: { 'activeGarden.mutation': { $ne: mutation.name } } },
			{ $group: { _id: null, total: { $sum: 1 } } },
		])

		const totalEligibleSlots =
			countResult.length > 0 ? countResult[0].total : 0

		if (totalEligibleSlots === 0) {
			return {
				totalEligibleSlots,
				targetCount: 0,
			}
		}

		// 2. Calculate 90% of the SLOTS (e.g., 5 slots * 0.9 = 4.5 -> 4)
		const targetCount = Math.floor(
			totalEligibleSlots * mutation.affectedChance,
		)

		if (targetCount === 0) {
			return {
				totalEligibleSlots,
				targetCount,
			}
		}

		// 3. Pick the specific slots
		const randomSlots = await UserProfile.aggregate([
			{
				$unwind: {
					path: '$activeGarden',
					includeArrayIndex: 'slotIndex',
				},
			},
			{ $match: { 'activeGarden.mutation': { $ne: mutation.name } } },
			{ $sample: { size: targetCount } },
			{ $project: { _id: 1, slotIndex: 1 } },
		])

		if (randomSlots.length === 0) return null

		// 2. Prepare bulk operations to push to the mutation array of those specific slots
		const bulkOps = randomSlots.map(slot => ({
			updateOne: {
				filter: { _id: slot._id },
				// Use the slotIndex we found during unwind to hit the right array element
				update: {
					$addToSet: {
						[`activeGarden.${slot.slotIndex}.mutation`]:
							mutation.name,
					},
				},
			},
		}))

		await UserProfile.bulkWrite(bulkOps)

		return {
			totalEligibleSlots,
			targetCount,
		}
	} catch (error) {
		console.error('Error updating random slots:', error)
	}

	return null
}

module.exports = { startMutations }
