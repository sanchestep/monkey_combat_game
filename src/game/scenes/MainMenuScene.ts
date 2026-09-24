import Phaser from 'phaser';
import { localizationService } from '../services/LocalizationService';
import { yandexSdkService } from '../services/YandexSdkService';

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        yandexSdkService.gameReady();
        
        this.input.keyboard?.removeAllListeners();

        const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'main_background');
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, localizationService.getText('game_title'), {
            fontSize: '64px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        const startBtn = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 100, localizationService.getText('start'), {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#ff0000',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        startBtn.on('pointerdown', () => {
            console.log('Кнопка "Начать" нажата');
            try {
                this.scene.start('CharacterSelectScene');
            } catch (error) {
                console.error('Error starting CharacterSelectScene:', error);
            }
        });

        this.input.keyboard?.on('keydown-ENTER', () => {
            console.log('Клавиша Enter нажата');
            try {
                this.scene.start('CharacterSelectScene');
            } catch (error) {
                console.error('Error starting CharacterSelectScene with Enter key:', error);
            }
        });

        startBtn.on('pointerover', () => {
            startBtn.setBackgroundColor('#cc0000');
        });

        startBtn.on('pointerout', () => {
            startBtn.setBackgroundColor('#ff0000');
        });
    }
}
