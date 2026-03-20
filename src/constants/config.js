module.exports = {
    startingBloomBuck: 50,
    baseGardenSlots: 5,
    upgradeCost: 500, // upgrade garden storage price (base price), maybe increase gradually
    
    variants: [
        { name: 'Normal', weight: 600, multiplier: 1 },
        { name: 'Gold', weight: 300, multiplier: 2 },
        { name: 'Shiny', weight: 90, multiplier: 5 },
    ],

    mutations: [
        { name: 'Wet', chance: 0.9, multiplier: 1.5 },
        { name: 'Shocked', chance: 0.3, multiplier: 5 },
    ],

    allMutations: [
        { name: 'Wet', chance: 0.9, multiplier: 1.5 },
        { name: 'Shocked', chance: 0.3, multiplier: 5 },
        { name: 'Gold', weight: 300, multiplier: 2 },
        { name: 'Shiny', weight: 90, multiplier: 5 },
    ]
};