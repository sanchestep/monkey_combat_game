export interface ArenaConfig {
    id: string;
    assetKey: string;
    displayName: string;
    sortName: string;
}

export const arenas: ArenaConfig[] = [
    {
        id: 'jungle_forest_background',
        assetKey: 'jungle_forest_background',
        displayName: 'Джунгли',
        sortName: 'jungle_forest_background'
    },
    {
        id: 'mountain_background',
        assetKey: 'mountain_background',
        displayName: 'Горы',
        sortName: 'mountain_background'
    },
    {
        id: 'river_background',
        assetKey: 'river_background',
        displayName: 'Река',
        sortName: 'river_background'
    },
    {
        id: 'temple_background',
        assetKey: 'temple_background',
        displayName: 'Храм',
        sortName: 'temple_background'
    },
    {
        id: 'volcano',
        assetKey: 'volcano',
        displayName: 'Вулкан',
        sortName: 'volcano'
    },
    {
        id: 'beach',
        assetKey: 'beach',
        displayName: 'Пляж',
        sortName: 'beach'
    }
];
