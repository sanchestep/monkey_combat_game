import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { MainMenuScene } from './game/scenes/MainMenuScene';
import { CharacterSelectScene } from './game/scenes/CharacterSelectScene';
import { ArenaSelectScene } from './game/scenes/ArenaSelectScene';
import { DifficultySelectScene } from './game/scenes/DifficultySelectScene';
import { FightScene } from './game/scenes/FightScene';
import { UIScene } from './game/scenes/UIScene';
import { OverlayScene } from './game/scenes/OverlayScene';
import { HintScene } from './game/scenes/HintScene';
import { TreeScene } from './game/scenes/TreeScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 1500 },
            debug: false
        }
    },
    input: {
        activePointers: 3
    },
    scene: [
        BootScene,
        MainMenuScene,
        CharacterSelectScene,
        ArenaSelectScene,
        DifficultySelectScene,
        TreeScene,
        FightScene,
       UIScene,
       OverlayScene,
       HintScene
    ],
    pixelArt: true,
    backgroundColor: '#000000'
};

export let game: Phaser.Game;

import { yandexSdkService } from './game/services/YandexSdkService';

async function initGame() {
    try {
        await yandexSdkService.init();
    } catch (e) {
        console.warn('Failed to initialize Yandex SDK before game start', e);
    }

    game = new Phaser.Game(config);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            game.loop.sleep();
        } else {
            game.loop.wake();
        }
    });
}

initGame();
