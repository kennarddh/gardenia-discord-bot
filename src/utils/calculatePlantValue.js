const { mutations } = require('../constants/config');

function calculatePlantValue(mutation, weight, baseWeight, baseValue, variant) {
    const cropValue = baseValue * Math.pow(weight / baseWeight, 2);

    let sum = 0;
    let count = 0;

    for (let m of mutation) {
        const found = mutations.find(x => x.name === m);
        if (found) {
            sum += found.multiplier;
            count++;
        }
    }

    const mutationMultiplier = variant * (1 + (sum - count));

    const totalPrice = cropValue * mutationMultiplier;

    return totalPrice;
}

module.exports = { calculatePlantValue };