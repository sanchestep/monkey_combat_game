import Phaser from 'phaser';
import { arenas } from '../config/arenas';
import { saveService } from '../services/SaveService';
import { localizationService } from '../services/LocalizationService';

export class ArenaSelectScene extends Phaser.Scene {
    private fighterId!: string;
    private selectedArenaId: string | null = null;
    private startBtn!: Phaser.GameObjects.Text;
    private cardBgs: { [id: string]: Phaser.GameObjects.Rectangle } = {};
    private arenaCards: { id: string, cardBg: Phaser.GameObjects.Rectangle }[] = [];
    private selectedIndex: number = 0;

    constructor() {
        super('ArenaSelectScene');
    }

    init(data: { fighterId: string }) {
        this.fighterId = data.fighterId;
    }

    create() {
        this.cardBgs = {};
        this.arenaCards = [];
        this.selectedIndex = 0;
        this.selectedArenaId = null;
        this.input.keyboard?.removeAllListeners();

        const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'main_background');
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        this.add.text(this.cameras.main.centerX, 50, localizationService.getText('select_arena'), {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const backBtn = this.add.image(50, 50, 'mobile_left').setInteractive({ useHandCursor: true });
        backBtn.setDisplaySize(64, 64);
        backBtn.on('pointerdown', () => {
            this.scene.start('CharacterSelectScene');
        });

        this.startBtn = this.add.text(this.cameras.main.width - 150, this.cameras.main.height - 80, localizationService.getText('start_fight'), {
            fontSize: '36px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#ff0000',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

        this.createGrid();

        this.startBtn.on('pointerdown', () => {
            if (this.selectedArenaId) {
                saveService.setLastSelectedArenaId(this.selectedArenaId);
                this.scene.start('DifficultySelectScene', {
                    fighterId: this.fighterId,
                    arenaId: this.selectedArenaId
                });
            }
        });

        this.input.keyboard?.on('keydown-ENTER', () => {
            if (this.selectedArenaId) {
                saveService.setLastSelectedArenaId(this.selectedArenaId);
                this.scene.start('DifficultySelectScene', {
                    fighterId: this.fighterId,
                    arenaId: this.selectedArenaId
                });
            }
        });
        
        // Set up arrow key navigation
        this.input.keyboard?.on('keydown-LEFT', () => {
            this.moveSelection('left');
        });
        
        this.input.keyboard?.on('keydown-RIGHT', () => {
            this.moveSelection('right');
        });
        
        this.input.keyboard?.on('keydown-UP', () => {
            this.moveSelection('up');
        });
        
        this.input.keyboard?.on('keydown-DOWN', () => {
            this.moveSelection('down');
        });
    }

    private createGrid() {
        const startX = this.cameras.main.centerX - 300;
        const startY = 250;
        const spacingX = 300;
        const spacingY = 200;
        const cols = 3;

        arenas.forEach((arena, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            const cardBg = this.add.rectangle(x, y, 220, 140, 0x333333).setInteractive({ useHandCursor: true });
            this.cardBgs[arena.id] = cardBg;
            this.arenaCards.push({ id: arena.id, cardBg });
            this.add.image(x, y - 10, arena.assetKey).setDisplaySize(200, 100);
            
            this.add.text(x, y + 60, localizationService.getText(arena.id), {
                fontSize: '20px',
                fontFamily: 'monospace',
                color: '#ffffff'
            }).setOrigin(0.5);

            cardBg.on('pointerdown', () => {
                // Find index of this arena
                const index = this.arenaCards.findIndex(card => card.id === arena.id);
                if (index !== -1) {
                    this.selectedIndex = index;
                }
                
                this.selectedArenaId = arena.id;
                this.startBtn.setVisible(true);
                
                this.updateSelection();
            });
        });
        
        // Select the first arena by default
        if (this.arenaCards.length > 0) {
            this.selectedIndex = 0;
            const firstArena = this.arenaCards[0];
            this.selectedArenaId = firstArena.id;
            this.startBtn.setVisible(true);
            this.updateSelection();
        }
    }
    
    private updateSelection() {
        // Reset all backgrounds
        Object.values(this.cardBgs).forEach(bg => bg.setFillStyle(0x333333));
        
        // Highlight selected arena
        const selectedArena = this.arenaCards[this.selectedIndex];
        if (selectedArena && this.cardBgs[selectedArena.id]) {
            this.cardBgs[selectedArena.id].setFillStyle(0xff0000);
        }
        
        // Update selected arena ID
        this.selectedArenaId = selectedArena.id;
        this.startBtn.setVisible(true);
    }
    
    private moveSelection(direction: 'left' | 'right' | 'up' | 'down') {
        if (this.arenaCards.length === 0) return;
        
        const cols = 3;
        const rows = Math.ceil(this.arenaCards.length / cols);
        const currentRow = Math.floor(this.selectedIndex / cols);
        const currentCol = this.selectedIndex % cols;
        
        let newRow = currentRow;
        let newCol = currentCol;
        
        switch (direction) {
            case 'left':
                newCol = (currentCol - 1 + cols) % cols;
                break;
            case 'right':
                newCol = (currentCol + 1) % cols;
                break;
            case 'up':
                newRow = (currentRow - 1 + rows) % rows;
                break;
            case 'down':
                newRow = (currentRow + 1) % rows;
                break;
        }
        
        // Make sure we don't go out of bounds
        const newIndex = newRow * cols + newCol;
        if (newIndex < this.arenaCards.length) {
            this.selectedIndex = newIndex;
        } else {
            // If we're trying to go to a position that doesn't exist,
            // go to the last item in the current column
            this.selectedIndex = (rows - 1) * cols + newCol;
            if (this.selectedIndex >= this.arenaCards.length) {
                this.selectedIndex = this.arenaCards.length - 1;
            }
        }
        
        this.updateSelection();
    }
}
