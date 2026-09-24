import Phaser from 'phaser';
import { audioService } from '../services/AudioService';

export class OverlayScene extends Phaser.Scene {
    private muteBtn!: Phaser.GameObjects.Image;
    private muteBtnBg!: Phaser.GameObjects.Arc;

    constructor() {
        super({ key: 'OverlayScene', active: false });
    }

    create() {
        // Ensure camera is initialized before using its properties
        const camera = this.cameras.main;
        if (!camera) {
            console.warn('Камера не инициализирована в OverlayScene');
            return;
        }

        this.muteBtnBg = this.add.circle(camera.width - 60, 60, 40, 0x555555, 0.3);
        this.muteBtn = this.add.image(camera.width - 60, 60, this.getMuteTexture())
            .setInteractive({ useHandCursor: true })
            .setDisplaySize(80, 80)
            .setAlpha(0.3)
            .setTint(0x888888);

        this.muteBtn.on('pointerdown', () => {
            audioService.toggleMute();
            this.muteBtn.setTexture(this.getMuteTexture());
        });
    }

    update() {
        const camera = this.cameras.main;
        if (!camera) return;

        if (this.scene.isActive('UIScene')) {
            this.muteBtnBg.setPosition(camera.centerX + 45, 80);
            this.muteBtn.setPosition(camera.centerX + 45, 80);
        } else {
            this.muteBtnBg.setPosition(camera.width - 60, 60);
            this.muteBtn.setPosition(camera.width - 60, 60);
        }

        const expectedTexture = this.getMuteTexture();
        if (this.muteBtn.texture.key !== expectedTexture) {
            this.muteBtn.setTexture(expectedTexture);
        }
    }

    private getMuteTexture() {
        return audioService.isMuted() ? 'sound_off' : 'sound_on';
    }
}
