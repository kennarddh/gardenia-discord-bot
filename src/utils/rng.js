const { mutations } = require('../constants/config');

function getMutation() {
    let totalWeight = 0;
    for (const mutation of mutations) {
        totalWeight += mutation.weight;
    }

    let roll = Math.random() * totalWeight;

    for (const mutation of mutations) {
        if (roll < mutation.weight) {
            return mutation;
        }
        roll -= mutation.weight; 
    }

    return MUTATIONS[0]; 
}

module.exports = { getMutation };