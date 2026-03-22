const mongoose = require('mongoose')
const UserProfile = require('../models/userProfile')

async function migrateProfiles() {
	await mongoose.connect(process.env.MONGO_URI, {
		serverSelectionTimeoutMS: 5000,
		socketTimeoutMS: 45000,
		family: 4,
	})

	const usersWithoutTracking = await UserProfile.find({
		tracking: { $exists: false },
	})

	if (usersWithoutTracking.length > 0) {
		console.log(`Migrating ${usersWithoutTracking.length} profiles...`)

		for (const user of usersWithoutTracking) {
			user.tracking = {
				plantPlants: new Map([['total', 0]]),
				harvestPlants: new Map([['total', 0]]),
				sellCrops: new Map([['total', 0]]),
				buySeeds: new Map([['total', 0]]),
			}
			await user.save()
		}
		console.log('Migration complete!')
	}

	await mongoose.disconnect()
}

migrateProfiles()
