module.exports = {
    startingBloomBuck: 50,
    baseGardenSlots: 5,
    upgradeCost: 500, // upgrade garden storage price (base price), maybe increase gradually
    
    mutations: [
        { name: 'Normal', weight: 600, multiplier: 1 },
        { name: 'Shiny', weight: 300, multiplier: 2 },
        { name: 'Golden', weight: 90, multiplier: 5 },
    ]
};