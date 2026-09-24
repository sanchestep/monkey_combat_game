import Phaser from 'phaser';
import { localizationService } from '../services/LocalizationService';

export class HintScene extends Phaser.Scene {
    private fighterId!: string;
    private arenaId!: string;
    private difficulty!: string;

    constructor() {
        super('HintScene');
    }

    init(data: { fighterId: string, arenaId: string, difficulty: string }) {
        this.fighterId = data.fighterId;
        this.arenaId = data.arenaId;
        this.difficulty = data.difficulty;
    }

    create() {
        // Background
        const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'main_background');
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        // Title
        this.add.text(this.cameras.main.centerX, 100, localizationService.getText('hint_title'), {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Controls text
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, localizationService.getText('hint_text'), {
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);

        // Banana images for timer
        const banana1 = this.add.image(this.cameras.main.centerX - 60, this.cameras.main.height - 100, 'banana_img');
        const banana2 = this.add.image(this.cameras.main.centerX, this.cameras.main.height - 100, 'banana_img');
        const banana3 = this.add.image(this.cameras.main.centerX + 60, this.cameras.main.height - 100, 'banana_img');
        
        // Scale bananas
        banana1.setDisplaySize(40, 40);
        banana2.setDisplaySize(40, 40);
        banana3.setDisplaySize(40, 40);
        
        // Initially show all bananas
        banana1.setVisible(true);
        banana2.setVisible(true);
        banana3.setVisible(true);

        // Start the countdown
        let timeLeft = 2;
        this.time.addEvent({
            delay: 500,
            repeat: 1,
            callback: () => {
                timeLeft--;
                
                // Update banana visibility based on time left
                switch(timeLeft) {
                    case 1:
                        banana1.setVisible(true);
                        banana2.setVisible(true);
                        banana3.setVisible(false);
                        break;
                    case 0:
                        banana1.setVisible(true);
                        banana2.setVisible(false);
                        banana3.setVisible(false);
                        
                        // Transition to the tree progression scene after a short delay
                        this.time.delayedCall(500, () => {
                            this.scene.start('TreeScene', {
                                playerFighterId: this.fighterId,
                                arenaId: this.arenaId,
                                difficulty: this.difficulty,
                                currentStreak: 0
                            });
                        });
                        break;
                }
            }
        });
    }
}