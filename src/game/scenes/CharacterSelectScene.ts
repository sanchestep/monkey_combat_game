import Phaser from 'phaser';
import { fighters } from '../config/fighters';
import { saveService } from '../services/SaveService';
import { yandexSdkService } from '../services/YandexSdkService';
import { localizationService } from '../services/LocalizationService';

export class CharacterSelectScene extends Phaser.Scene {
    private selectedFighterId: string | null = null;
    private nextBtn!: Phaser.GameObjects.Text;
    private previewImage!: Phaser.GameObjects.Image;
    private statsText!: Phaser.GameObjects.Text;
    private cardBgs: { [id: string]: Phaser.GameObjects.Rectangle } = {};
    private fighterCards: { id: string, cardBg: Phaser.GameObjects.Rectangle, isUnlocked: boolean }[] = [];
    private selectedIndex: number = 0;
    private catalog: any[] = [];

    constructor() {
        super('CharacterSelectScene');
    }

    async create() {
        // Загрузить каталог из Yandex SDK, чтобы отобразить цены и название/иконку валюты портала
        // can be rendered on locked fighter cards (Yandex Games moderation, item 1.13.4).
        try {
            this.catalog = await yandexSdkService.getCatalog();
        } catch (e) {
            this.catalog = [];
        }

        this.cardBgs = {};
        this.fighterCards = [];
        this.selectedIndex = 0;
        this.selectedFighterId = null;
        this.input.keyboard?.removeAllListeners();

        const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'main_background');
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        this.add.text(this.cameras.main.centerX, 50, localizationService.getText('select_fighter'), {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.createPreviewPanel();
        
        // Create next button before grid so it's available when selectFighter is called
        this.nextBtn = this.add.text(this.cameras.main.width - 150, this.cameras.main.height - 50, localizationService.getText('next'), {
            fontSize: '36px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#00aa00',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

        this.nextBtn.on('pointerdown', () => {
            if (this.selectedFighterId) {
                // Check if the selected fighter is unlocked before proceeding
                const selectedFighter = fighters.find(f => f.id === this.selectedFighterId);
                const isUnlocked = selectedFighter && saveService.unlockedFighters.includes(selectedFighter.id);
                
                if (selectedFighter && isUnlocked) {
                    saveService.setLastSelectedFighterId(this.selectedFighterId);
                    this.scene.start('ArenaSelectScene', { fighterId: this.selectedFighterId });
                }
            }
        });

        this.input.keyboard?.on('keydown-ENTER', () => {
            if (this.selectedFighterId) {
                // Check if the selected fighter is unlocked before proceeding
                const selectedFighter = fighters.find(f => f.id === this.selectedFighterId);
                const isUnlocked = selectedFighter && saveService.unlockedFighters.includes(selectedFighter.id);
                
                if (selectedFighter && isUnlocked) {
                    saveService.setLastSelectedFighterId(this.selectedFighterId);
                    this.scene.start('ArenaSelectScene', { fighterId: this.selectedFighterId });
                }
            }
        });

        this.createGrid();
        
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

    private createPreviewPanel() {
        const panelX = 250;
        const panelY = this.cameras.main.centerY;

        this.add.rectangle(panelX, panelY, 400, 500, 0x000000, 0.7);

        this.previewImage = this.add.image(panelX, panelY - 100, 'capuchin').setVisible(false);
        
        this.statsText = this.add.text(panelX, panelY + 100, '', {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }

    private createGrid() {
        const startX = 600;
        const startY = 200;
        const spacingX = 150;
        const spacingY = 180;
        const cols = 4;
        // Limit the number of rows to prevent overlap with the "Next" button
        const maxRows = 3;

        fighters.forEach((fighter, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            // Skip rendering fighters that would go beyond the max rows
            if (row >= maxRows) return;
            
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            const isUnlocked = saveService.unlockedFighters.includes(fighter.id);

            const cardBg = this.add.rectangle(x, y, 120, 120, 0x333333).setInteractive({ useHandCursor: true });
            this.cardBgs[fighter.id] = cardBg;
            this.fighterCards.push({ id: fighter.id, cardBg, isUnlocked });
            
            const img = this.add.image(x, y - 10, fighter.assetKey).setDisplaySize(80, 80);
            
            if (!isUnlocked) {
                img.setTint(0x555555);
                this.add.text(x, y - 30, '🔒', { fontSize: '28px' }).setOrigin(0.5);
            }

            this.add.text(x, y + 60, localizationService.getText(fighter.id), {
                fontSize: '16px',
                fontFamily: 'monospace',
                color: '#ffffff'
            }).setOrigin(0.5);

            // Отобразить блок цены для покупаемых, но заблокированных бойцов, используя данные каталога из SDK.
            // Строка цены из SDK уже включает название валюты портала (например, "10 YAN"),
            // а getPriceCurrencyImage() возвращает URL иконки валюты портала.
            if (!isUnlocked && fighter.purchasable && fighter.purchaseProductId) {
                const product = this.catalog.find(p => p.id === fighter.purchaseProductId);
                const priceLabel = product?.price || `${fighter.purchaseProductId === 'monkey_king' ? 10 : 3} YAN`;
                const iconUrl = product && typeof product.getPriceCurrencyImage === 'function'
                    ? product.getPriceCurrencyImage('small')
                    : '';

                const priceText = this.add.text(x, y + 78, priceLabel, {
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    color: '#ffd700',
                    fontStyle: 'bold'
                }).setOrigin(0.5);

                if (iconUrl) {
                    const iconKey = `currency_icon_${fighter.purchaseProductId}`;
                    if (this.textures.exists(iconKey)) {
                        const icon = this.add.image(x + priceText.width / 2 + 10, y + 78, iconKey);
                        icon.setDisplaySize(16, 16);
                    } else {
                        this.load.image(iconKey, iconUrl);
                        this.load.once('complete', () => {
                            if (this.textures.exists(iconKey)) {
                                const icon = this.add.image(x + priceText.width / 2 + 10, y + 78, iconKey);
                                icon.setDisplaySize(16, 16);
                            }
                        });
                        this.load.start();
                    }
                }
            }

            cardBg.on('pointerdown', async () => {
                if (isUnlocked) {
                    // Find index of this fighter
                    const index = this.fighterCards.findIndex(card => card.id === fighter.id);
                    if (index !== -1) {
                        this.selectedIndex = index;
                        this.updateSelection();
                    }
                    this.selectFighter(fighter.id);
                } else if (fighter.purchasable && fighter.purchaseProductId) {
                    const success = await yandexSdkService.purchase(fighter.purchaseProductId);
                    if (success) {
                        await saveService.unlockFighter(fighter.id);
                        this.scene.restart(); // Refresh UI
                    }
                }
            });
        });
        
        // Select the first unlocked fighter by default
        const firstUnlockedIndex = this.fighterCards.findIndex(card => card.isUnlocked);
        if (firstUnlockedIndex !== -1) {
            this.selectedIndex = firstUnlockedIndex;
            this.updateSelection();
        }
    }

    private selectFighter(id: string) {
        this.selectedFighterId = id;
        const fighter = fighters.find(f => f.id === id)!;

        Object.values(this.cardBgs).forEach(bg => bg.setFillStyle(0x333333));
        if (this.cardBgs[id]) {
            this.cardBgs[id].setFillStyle(0xff0000);
        }

        this.previewImage.setTexture(fighter.assetKey).setDisplaySize(200, 200).setVisible(true);
        
        const stats = `${localizationService.getText('strength')}${'★'.repeat(fighter.stats.strength)}\n${localizationService.getText('speed')}${'★'.repeat(fighter.stats.speed)}\n${localizationService.getText('ranged')}${'★'.repeat(fighter.stats.ranged)}`;
        this.statsText.setText(stats);

        // Ensure the button exists and is visible
        if (this.nextBtn) {
            this.nextBtn.setVisible(true);
        }
    }
    
    private updateSelection() {
        // Reset all backgrounds
        Object.values(this.cardBgs).forEach(bg => bg.setFillStyle(0x333333));
        
        // Highlight selected fighter
        const selectedFighter = this.fighterCards[this.selectedIndex];
        if (selectedFighter && this.cardBgs[selectedFighter.id]) {
            this.cardBgs[selectedFighter.id].setFillStyle(0xff0000);
        }
        
        // If the selected fighter is unlocked, select it
        if (selectedFighter && selectedFighter.isUnlocked) {
            const fighter = fighters.find(f => f.id === selectedFighter.id);
            if (fighter) {
                this.selectFighter(fighter.id);
            }
        }
    }
    private moveSelection(direction: 'left' | 'right' | 'up' | 'down') {
        if (this.fighterCards.length === 0) return;
        
        const cols = 4;
        // Limit rows to prevent overlap with the "Next" button
        const maxRows = 3;
        const visibleFighters = this.fighterCards.slice(0, cols * maxRows);
        const rows = Math.ceil(visibleFighters.length / cols);
        const currentRow = Math.floor(this.selectedIndex / cols);
        const currentCol = this.selectedIndex % cols;
        
        // If we're trying to navigate beyond the visible fighters, ignore the input
        if (this.selectedIndex >= visibleFighters.length) {
            return;
        }
        
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
        if (newIndex < visibleFighters.length) {
            this.selectedIndex = newIndex;
        } else {
            // If we're trying to go to a position that doesn't exist,
            // go to the last item in the current column
            this.selectedIndex = (rows - 1) * cols + newCol;
            if (this.selectedIndex >= visibleFighters.length) {
                this.selectedIndex = visibleFighters.length - 1;
            }
        }
        
        this.updateSelection();
    }
}
