export interface FighterConfig {
    id: string;
    assetKey: string;
    displayName: string;
    sortName: string;
    purchasable: boolean;
    purchaseProductId: string | null;
    stats: {
        strength: number;
        speed: number;
        ranged: number;
    };
    gameplayModifiers: {
        moveSpeedMultiplier: number;
        jumpMultiplier: number;
        punchDamageMultiplier: number;
        kickDamageMultiplier: number;
        bananaDamageMultiplier: number;
    };
}

export const fighters: FighterConfig[] = [
    {
        id: 'capuchin',
        assetKey: 'capuchin',
        displayName: 'Капуцин',
        sortName: 'capuchin',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 2, speed: 5, ranged: 3 },
        gameplayModifiers: { moveSpeedMultiplier: 1.2, jumpMultiplier: 1.1, punchDamageMultiplier: 0.8, kickDamageMultiplier: 0.8, bananaDamageMultiplier: 1.0 }
    },
    {
        id: 'chimpanzee',
        assetKey: 'chimpanzee',
        displayName: 'Шимпанзе',
        sortName: 'chimpanzee',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 4, speed: 3, ranged: 3 },
        gameplayModifiers: { moveSpeedMultiplier: 1.0, jumpMultiplier: 1.0, punchDamageMultiplier: 1.2, kickDamageMultiplier: 1.2, bananaDamageMultiplier: 1.0 }
    },
    {
        id: 'gorilla',
        assetKey: 'gorilla',
        displayName: 'Горилла',
        sortName: 'gorilla',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 5, speed: 1, ranged: 2 },
        gameplayModifiers: { moveSpeedMultiplier: 0.7, jumpMultiplier: 0.8, punchDamageMultiplier: 1.5, kickDamageMultiplier: 1.5, bananaDamageMultiplier: 0.8 }
    },
    {
        id: 'mandrill',
        assetKey: 'mandrill',
        displayName: 'Мандрил',
        sortName: 'mandrill',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 3, speed: 4, ranged: 3 },
        gameplayModifiers: { moveSpeedMultiplier: 1.1, jumpMultiplier: 1.0, punchDamageMultiplier: 1.0, kickDamageMultiplier: 1.0, bananaDamageMultiplier: 1.0 }
    },
    {
        id: 'monkey_king',
        assetKey: 'monkey_king',
        displayName: 'Король обезьян',
        sortName: 'monkey_king',
        purchasable: true,
        purchaseProductId: 'monkey_king',
        stats: { strength: 5, speed: 5, ranged: 5 },
        gameplayModifiers: { moveSpeedMultiplier: 1.3, jumpMultiplier: 1.2, punchDamageMultiplier: 1.3, kickDamageMultiplier: 1.3, bananaDamageMultiplier: 1.3 }
    },
    {
        id: 'nose',
        assetKey: 'nose',
        displayName: 'Носач',
        sortName: 'nose',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 3, speed: 2, ranged: 5 },
        gameplayModifiers: { moveSpeedMultiplier: 0.9, jumpMultiplier: 0.9, punchDamageMultiplier: 1.0, kickDamageMultiplier: 1.0, bananaDamageMultiplier: 1.5 }
    },
    {
        id: 'orange',
        assetKey: 'orange',
        displayName: 'Оранж',
        sortName: 'orange',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 3, speed: 3, ranged: 3 },
        gameplayModifiers: { moveSpeedMultiplier: 1.0, jumpMultiplier: 1.0, punchDamageMultiplier: 1.0, kickDamageMultiplier: 1.0, bananaDamageMultiplier: 1.0 }
    },
    {
        id: 'orangutan',
        assetKey: 'orangutan',
        displayName: 'Орангутан',
        sortName: 'orangutan',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 4, speed: 2, ranged: 3 },
        gameplayModifiers: { moveSpeedMultiplier: 0.8, jumpMultiplier: 0.9, punchDamageMultiplier: 1.3, kickDamageMultiplier: 1.3, bananaDamageMultiplier: 1.0 }
    },
    {
        id: 'spider_monkey',
        assetKey: 'spider_monkey',
        displayName: 'Паукообразная',
        sortName: 'spider_monkey',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 2, speed: 5, ranged: 4 },
        gameplayModifiers: { moveSpeedMultiplier: 1.2, jumpMultiplier: 1.2, punchDamageMultiplier: 0.8, kickDamageMultiplier: 0.8, bananaDamageMultiplier: 1.2 }
    },
    {
        id: 'cacajao',
        assetKey: 'cacajao',
        displayName: 'Какажао',
        sortName: 'cacajao',
        purchasable: true,
        purchaseProductId: 'cacajao',
        stats: { strength: 4, speed: 4, ranged: 4 },
        gameplayModifiers: { moveSpeedMultiplier: 1.2, jumpMultiplier: 1.1, punchDamageMultiplier: 1.2, kickDamageMultiplier: 1.2, bananaDamageMultiplier: 1.2 }
    },
    {
        id: 'tamarin',
        assetKey: 'tamarin',
        displayName: 'Тамарин',
        sortName: 'tamarin',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 2, speed: 5, ranged: 3 },
        gameplayModifiers: { moveSpeedMultiplier: 1.2, jumpMultiplier: 1.1, punchDamageMultiplier: 0.8, kickDamageMultiplier: 0.8, bananaDamageMultiplier: 1.0 }
    },
    {
        id: 'tibetan_macaque',
        assetKey: 'tibetan_macaque',
        displayName: 'Тибетская макака',
        sortName: 'tibetan_macaque',
        purchasable: false,
        purchaseProductId: null,
        stats: { strength: 4, speed: 4, ranged: 3 },
        gameplayModifiers: { moveSpeedMultiplier: 1.0, jumpMultiplier: 1.0, punchDamageMultiplier: 1.2, kickDamageMultiplier: 1.2, bananaDamageMultiplier: 1.0 }
    }
];

/**
 * Returns the ordered list of enemy fighter ids the player will face during a run,
 * from weakest to strongest, with monkey_king forced to be the final boss.
 *
 * The order is determined by total stats (strength + speed + ranged) ascending,
 * tie-broken by sortName. The player's own fighter is excluded.
 */
export function getEnemyOrder(playerFighterId: string): string[] {
    const enemyOrder = fighters
        .filter(f => f.id !== playerFighterId && f.id !== 'monkey_king')
        .slice()
        .sort((a, b) => {
            const sumA = a.stats.strength + a.stats.speed + a.stats.ranged;
            const sumB = b.stats.strength + b.stats.speed + b.stats.ranged;
            if (sumA !== sumB) return sumA - sumB;
            return a.sortName.localeCompare(b.sortName);
        })
        .map(f => f.id);

    // Append the final boss. When the player IS the Monkey King there is no
    // separate king to fight (you can't be your own boss), so we leave the
    // strongest remaining monkey as the final opponent. This also keeps the
    // run at the expected 11 opponents (10 trunk slots + crown) instead of 12,
    // which previously pushed an extra, mis-placed trunk segment in TreeScene.
    if (playerFighterId !== 'monkey_king') {
        enemyOrder.push('monkey_king');
    }

    return enemyOrder;
}
