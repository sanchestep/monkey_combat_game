import Phaser from 'phaser';
import { localizationService } from '../services/LocalizationService';

export class DifficultySelectScene extends Phaser.Scene {
    private fighterId!: string;
    private arenaId!: string;
    private difficultyButtons: Phaser.GameObjects.Text[] = [];
    private selectedIndex: number = 0;

    constructor() {
        super('DifficultySelectScene');
    }

    init(data: { fighterId: string, arenaId: string }) {
        this.fighterId = data.fighterId;
        this.arenaId = data.arenaId;
    }

    create() {
        this.difficultyButtons = [];
        this.selectedIndex = 0;
        this.input.keyboard?.removeAllListeners();

        const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'main_background');
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        this.add.text(this.cameras.main.centerX, 100, localizationService.getText('select_difficulty'), {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const backBtn = this.add.image(50, 50, 'mobile_left').setInteractive({ useHandCursor: true });
        backBtn.setDisplaySize(64, 64);
        backBtn.on('pointerdown', () => {
            this.scene.start('ArenaSelectScene', { fighterId: this.fighterId });
        });

        const difficulties = [
            { id: 'easy', name: localizationService.getText('diff_easy'), color: '#00ff00' },
            { id: 'medium', name: localizationService.getText('diff_medium'), color: '#ffff00' },
            { id: 'hard', name: localizationService.getText('diff_hard'), color: '#ff0000' }
        ];

        difficulties.forEach((diff, index) => {
            const y = 250 + index * 120;
            const btn = this.add.text(this.cameras.main.centerX, y, diff.name, {
                fontSize: '36px',
                fontFamily: 'monospace',
                color: diff.color,
                padding: { x: 20, y: 10 },
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            
            // Store original color for later use
            btn.setData('originalColor', diff.color);
            
            this.difficultyButtons.push(btn);

            btn.on('pointerdown', () => {
                // Find index of this difficulty
                const index = difficulties.findIndex(d => d.id === diff.id);
                if (index !== -1) {
                    this.selectedIndex = index;
                    this.updateSelection();
                }
                
                this.scene.start('HintScene', {
                    fighterId: this.fighterId,
                    arenaId: this.arenaId,
                    difficulty: diff.id
                });
            });
        });
        
        // Select the first difficulty by default
        if (this.difficultyButtons.length > 0) {
            this.selectedIndex = 0;
            this.updateSelection();
        }
        
        // Set up arrow key navigation
        this.input.keyboard?.on('keydown-UP', () => {
            this.moveSelection('up');
        });
        
        this.input.keyboard?.on('keydown-DOWN', () => {
            this.moveSelection('down');
        });
        
        // Set up Enter key to select difficulty
        this.input.keyboard?.on('keydown-ENTER', () => {
            this.selectDifficulty();
        });
    }
    
    private updateSelection() {
        // Reset all button styles
        this.difficultyButtons.forEach((btn, index) => {
            const isSelected = index === this.selectedIndex;
            btn.setColor(isSelected ? '#ffffff' : btn.getData('originalColor') || '#ffffff');
            // Add a visual indicator for selection
            if (isSelected) {
                btn.setBackgroundColor('#ff0000');
            } else {
                btn.setBackgroundColor('');
            }
        });
    }
    
    private moveSelection(direction: 'up' | 'down') {
        if (this.difficultyButtons.length === 0) return;
        
        switch (direction) {
            case 'up':
                this.selectedIndex = (this.selectedIndex - 1 + this.difficultyButtons.length) % this.difficultyButtons.length;
                break;
            case 'down':
                this.selectedIndex = (this.selectedIndex + 1) % this.difficultyButtons.length;
                break;
        }
        
        this.updateSelection();
    }
    
    private selectDifficulty() {
        if (this.difficultyButtons.length === 0) return;
        
        const difficulties = [
            { id: 'easy', name: localizationService.getText('diff_easy'), color: '#00ff00' },
            { id: 'medium', name: localizationService.getText('diff_medium'), color: '#ffff00' },
            { id: 'hard', name: localizationService.getText('diff_hard'), color: '#ff0000' }
        ];
        
        const selectedDiff = difficulties[this.selectedIndex];
       if (selectedDiff) {
           this.scene.start('HintScene', {
               fighterId: this.fighterId,
               arenaId: this.arenaId,
               difficulty: selectedDiff.id
           });
       }
    }
}
