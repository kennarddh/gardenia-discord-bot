module.exports = [
    {
        id: 'garden_slots',
        name: 'Garden Slots',
        description: 'Increases the number of plots you can plant in your garden (+1).',
        maxLevel: 25,
        cost: (currentLevel) => 500 * Math.pow(1.5, currentLevel),
    }
];