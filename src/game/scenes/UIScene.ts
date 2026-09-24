import Phaser from 'phaser';
import { FightScene } from './FightScene';
import { yandexSdkService } from '../services/YandexSdkService';
import { localizationService } from '../services/LocalizationService';
import { fighters } from '../config/fighters';
import { balance } from '../config/balance';

// Describes one cooldown indicator slot
interface CooldownIndicator {
    graphics: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Image;
    cx: number;
    cy: number;
    radius: number;
    maxCooldown: number;
    cooldownKey: 'punch' | 'kick' | 'banana' | 'dynamite';
}

export class UIScene extends Phaser.Scene {
    private fightScene!: FightScene;
    private playerHpBar!: Phaser.GameObjects.Rectangle;
    private enemyHpBar!: Phaser.GameObjects.Rectangle;
    private visibilityChangeHandler!: () => void;
    private cooldownIndicators: CooldownIndicator[] = [];
    private mobileButtons: { [key: string]: Phaser.GameObjects.Image } = {};

    constructor() {
        super('UIScene');
    }

    init(data: { fightScene: FightScene }) {
        this.fightScene = data.fightScene;
    }

    create() {
        // HP Bars (Pixelated style)
        // Player
        this.add.rectangle(20, 20, 300, 30, 0x000000).setOrigin(0, 0); // border
        this.add.rectangle(22, 22, 296, 26, 0x555555).setOrigin(0, 0); // bg
        this.playerHpBar = this.add.rectangle(22, 22, 296, 26, 0x00ff00).setOrigin(0, 0);

        // Enemy
        this.add.rectangle(this.cameras.main.width - 320, 20, 300, 30, 0x000000).setOrigin(0, 0);
        this.add.rectangle(this.cameras.main.width - 318, 22, 296, 26, 0x555555).setOrigin(0, 0);
        this.enemyHpBar = this.add.rectangle(this.cameras.main.width - 318, 22, 296, 26, 0x00ff00).setOrigin(0, 0);

        // Streak
        this.add.text(this.cameras.main.centerX, 30, `${localizationService.getText('streak')}${this.fightScene.getCurrentStreak()}`, {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Events
        this.fightScene.events.on('hp-changed', this.updateHp, this);
        this.fightScene.events.on('round-end', this.showModal, this);

        // Restart Button
        this.add.circle(this.cameras.main.centerX - 45, 80, 40, 0x555555, 0.8);
        const restartBtn = this.add.image(this.cameras.main.centerX - 45, 80, 'restart')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDisplaySize(80, 80);

        restartBtn.on('pointerdown', () => {
            this.restartRun();
        });

        // Controls Hint
        if (!this.sys.game.device.os.android && !this.sys.game.device.os.iOS) {
            this.add.text(this.cameras.main.centerX, this.cameras.main.height - 20, localizationService.getText('controls'), {
                fontSize: '16px',
                fontFamily: 'monospace',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5);
        }

        // Mobile controls
        if (this.sys.game.device.os.android || this.sys.game.device.os.iOS) {
            this.createMobileControls();
        }

        this.createPreFightScreen();
        this.createPauseMenu();
        this.createCooldownIndicators();

        // Handle visibility change
        this.sys.game.events.on('hidden', this.onGameHidden, this);
        
        // Handle page visibility change (tab switching)
        this.visibilityChangeHandler = this.onVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
        
        this.events.on('shutdown', () => {
            this.sys.game.events.off('hidden', this.onGameHidden, this);
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        });
    }

    private pauseContainer!: Phaser.GameObjects.Container;

    private createPauseMenu() {
        this.pauseContainer = this.add.container(0, 0);
        this.pauseContainer.setVisible(false);
        this.pauseContainer.setDepth(1000);

        const overlay = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8);
        overlay.setInteractive(); // Block clicks
        this.pauseContainer.add(overlay);

        const pauseText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, localizationService.getText('paused'), {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.pauseContainer.add(pauseText);

        const resumeBtn = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, localizationService.getText('resume'), {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#555555',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        resumeBtn.on('pointerdown', () => {
            this.resumeGame();
        });
        this.pauseContainer.add(resumeBtn);
    }

    private onGameHidden() {
        if (!this.fightScene.isPaused && !this.fightScene.isGameOver) {
            this.fightScene.pauseGame();
            this.pauseContainer.setVisible(true);
        }
    }

    private resumeGame() {
        this.pauseContainer.setVisible(false);
        this.fightScene.resumeGame();
    }

    private onVisibilityChange() {
        if (document.hidden) {
            // When tab is hidden (switched away), pause the game
            if (!this.fightScene.isPaused && !this.fightScene.isGameOver) {
                this.fightScene.pauseGame();
                this.pauseContainer.setVisible(true);
            }
        } else {
            // When tab is visible again, keep it paused until user interaction
            // The pause menu will still be visible for the user to resume manually
        }
    }

    private createPreFightScreen() {
        const container = this.add.container(0, 0);
        
        // Dark overlay
        const overlay = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8);
        container.add(overlay);

        const pConfig = fighters.find(f => f.id === this.fightScene.playerFighterId)!;
        const eConfig = fighters.find(f => f.id === this.fightScene.enemyFighterId)!;

        // Player Info (Left)
        const pImage = this.add.image(this.cameras.main.centerX - 250, this.cameras.main.centerY - 50, pConfig.assetKey);
        pImage.setDisplaySize(200, 200);
        container.add(pImage);

        const pName = this.add.text(this.cameras.main.centerX - 250, this.cameras.main.centerY + 80, localizationService.getText(pConfig.id) || pConfig.displayName, {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(pName);

        const pStats = this.add.text(this.cameras.main.centerX - 250, this.cameras.main.centerY + 140,
            `${localizationService.getText('strength')}${pConfig.stats.strength}\n` +
            `${localizationService.getText('speed')}${pConfig.stats.speed}\n` +
            `${localizationService.getText('ranged')}${pConfig.stats.ranged}`, {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);
        container.add(pStats);

        // Enemy Info (Right)
        const eImage = this.add.image(this.cameras.main.centerX + 250, this.cameras.main.centerY - 50, eConfig.assetKey);
        eImage.setDisplaySize(200, 200);
        eImage.setFlipX(true);
        container.add(eImage);

        const eName = this.add.text(this.cameras.main.centerX + 250, this.cameras.main.centerY + 80, localizationService.getText(eConfig.id) || eConfig.displayName, {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(eName);

        const eStats = this.add.text(this.cameras.main.centerX + 250, this.cameras.main.centerY + 140,
            `${localizationService.getText('strength')}${eConfig.stats.strength}\n` +
            `${localizationService.getText('speed')}${eConfig.stats.speed}\n` +
            `${localizationService.getText('ranged')}${eConfig.stats.ranged}`, {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);
        container.add(eStats);

        // VS Text
        const vsText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, 'VS', {
            fontSize: '64px',
            fontFamily: 'monospace',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(vsText);

        // Timer
        let timeLeft = 3;
        const timerImages: Phaser.GameObjects.Image[] = [];
        
        const updateTimerImages = () => {
            timerImages.forEach(img => img.destroy());
            timerImages.length = 0;
            
            if (timeLeft > 0) {
                const spacing = 80;
                const startX = this.cameras.main.centerX - ((timeLeft - 1) * spacing) / 2;
                
                for (let i = 0; i < timeLeft; i++) {
                    const img = this.add.image(startX + i * spacing, this.cameras.main.centerY + 50, 'counter');
                    img.setDisplaySize(60, 60);
                    container.add(img);
                    timerImages.push(img);
                }
            }
        };

        updateTimerImages();

        this.time.addEvent({
            delay: 1000,
            repeat: 2,
            callback: () => {
                timeLeft--;
                if (timeLeft > 0) {
                    updateTimerImages();
                } else {
                    container.destroy();
                    this.fightScene.startFight();
                    
                    const fightText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'БОЙ!', {
                        fontSize: '100px',
                        fontFamily: 'monospace',
                        color: '#00ff00',
                        fontStyle: 'bold',
                        stroke: '#000000',
                        strokeThickness: 8
                    }).setOrigin(0.5);
                    
                    this.tweens.add({
                        targets: fightText,
                        alpha: 0,
                        scale: 1.5,
                        duration: 1000,
                        onComplete: () => fightText.destroy()
                    });
                }
            }
        });
    }

    private updateHp(data: { playerHp: number, enemyHp: number }) {
        const maxHp = FightScene.MAX_HP;
        this.playerHpBar.width = 296 * (data.playerHp / maxHp);
        this.enemyHpBar.width = 296 * (data.enemyHp / maxHp);

        const getColor = (hp: number) => {
            const pct = (hp / maxHp) * 100;
            if (pct < 25) return 0xff0000;
            if (pct < 50) return 0xffff00;
            return 0x00ff00;
        };

        this.playerHpBar.fillColor = getColor(data.playerHp);
        this.enemyHpBar.fillColor = getColor(data.enemyHp);
    }

    private showModal(data: any) {
        this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, 600, 400, 0x000000, 0.8);
        
        let title = '';
        let text = '';
        let buttons: { label: string, action: () => void }[] = [];

        if (data.winner === 'player') {
            if (data.enemyId === 'monkey_king') {
                title = localizationService.getText('king_defeated');
                buttons = [
                    { label: localizationService.getText('continue_streak'), action: () => this.continueRun(data.streak) },
                    { label: localizationService.getText('restart'), action: () => this.restartRun() }
                ];
            } else {
                title = localizationService.getText('victory');
                buttons = [
                    { label: localizationService.getText('continue'), action: () => this.continueRun(data.streak) },
                    { label: localizationService.getText('restart'), action: () => this.restartRun() }
                ];
            }
        } else {
            title = localizationService.getText('defeat');
            text = `${localizationService.getText('best_streak')}${data.bestStreak}`;
            buttons = [
                { label: localizationService.getText('restart'), action: () => this.restartRun() }
            ];
        }

        const isLongTitle = title.length > 20;
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, title, {
            fontSize: isLongTitle ? '24px' : '36px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 560, useAdvancedWrap: true }
        }).setOrigin(0.5);

        if (text) {
            this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 40, text, {
                fontSize: '24px',
                fontFamily: 'monospace',
                color: '#aaaaaa'
            }).setOrigin(0.5);
        }

        buttons.forEach((btn, index) => {
            const y = this.cameras.main.centerY + 40 + index * 80;
            const btnObj = this.add.text(this.cameras.main.centerX, y, btn.label, {
                fontSize: '28px',
                fontFamily: 'monospace',
                color: '#ffffff',
                backgroundColor: '#555555',
                padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            btnObj.on('pointerdown', async () => {
                btnObj.disableInteractive();
                await yandexSdkService.showInterstitialAd();
                btn.action();
            });
        });
    }

    private continueRun(streak: number) {
        const data = {
            playerFighterId: (this.fightScene as any).playerFighterId,
            arenaId: (this.fightScene as any).arenaId,
            currentStreak: streak,
            difficulty: this.fightScene.getDifficulty()
        };
        this.scene.stop('UIScene');
        this.scene.stop('FightScene');
        // Route through the tree progression scene so the cleared segment drops away,
        // the tree shifts down (or rebuilds if every enemy was defeated) and the camera
        // zooms onto the next opponent before the fight starts.
        this.scene.start('TreeScene', data);
    }

    private restartRun() {
        this.scene.stop('UIScene');
        this.scene.stop('FightScene');
        this.scene.start('CharacterSelectScene');
    }

    private createCooldownIndicators() {
        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;

        // 4 attack slots: punch (ENTER), kick (SHIFT), banana (SPACE), dynamite (SPACE+ENTER)
        const slots: { key: 'punch' | 'kick' | 'banana' | 'dynamite'; iconKey: string; maxCd: number }[] = [
            { key: 'punch',    iconKey: 'mobile_fist', maxCd: balance.punch.cooldown },
            { key: 'kick',     iconKey: 'mobile_leg',  maxCd: balance.kick.cooldown },
            { key: 'banana',   iconKey: 'mobile_pill', maxCd: balance.banana.cooldown },
            { key: 'dynamite', iconKey: 'dynamite',    maxCd: balance.dynamite.cooldown },
        ];

        this.cooldownIndicators = [];

        if (isMobile) {
            slots.forEach((slot) => {
                const btn = this.mobileButtons[slot.key];
                if (!btn) return;

                const cx = btn.x;
                const cy = btn.y;
                const radius = 50; // Fixed radius for mobile buttons

                const gfx = this.add.graphics().setDepth(102);

                this.cooldownIndicators.push({
                    graphics: gfx,
                    icon: btn,
                    cx,
                    cy,
                    radius,
                    maxCooldown: slot.maxCd,
                    cooldownKey: slot.key,
                });
            });
        } else {
            const radius = 28;
            const spacing = 72;
            const startX = 20 + radius; // Below player health bar
            const y = 80;

            slots.forEach((slot, i) => {
                const cx = startX + i * spacing;
                const cy = y;

                // Dark circle background
                this.add.circle(cx, cy, radius, 0x000000, 0.55).setDepth(10);

                // Graphics for the arc sweep
                const gfx = this.add.graphics().setDepth(11);

                // Attack icon inside the circle
                const icon = this.add.image(cx, cy, slot.iconKey)
                    .setDisplaySize(radius * 1.1, radius * 1.1)
                    .setDepth(12);

                this.cooldownIndicators.push({
                    graphics: gfx,
                    icon,
                    cx,
                    cy,
                    radius,
                    maxCooldown: slot.maxCd,
                    cooldownKey: slot.key,
                });
            });
        }
    }

    update() {
        if (this.cooldownIndicators.length === 0) return;
        if (!this.fightScene) return;

        const cooldowns = this.fightScene.getPlayerCooldowns();
        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;

        this.cooldownIndicators.forEach(ind => {
            const gfx = ind.graphics;
            gfx.clear();

            const remaining = Math.max(0, cooldowns[ind.cooldownKey]);
            const fraction = remaining / ind.maxCooldown; // 1 = full cooldown, 0 = ready

            if (fraction <= 0) {
                // Ready
                if (!isMobile) {
                    gfx.lineStyle(3, 0x00ff88, 0.5);
                    gfx.strokeCircle(ind.cx, ind.cy, ind.radius);
                    ind.icon.setAlpha(0.55);
                }
                return;
            }

            // Dim the icon while on cooldown
            if (!isMobile) {
                ind.icon.setAlpha(0.22);
            }

            // Dark overlay arc (the "used" portion, clockwise from top)
            gfx.fillStyle(0x000000, 0.65);
            gfx.beginPath();
            // Start at center, draw the filled "pie slice" for the remaining cooldown
            const startAngle = -Math.PI / 2;                        // 12 o'clock
            const endAngle   = startAngle + fraction * Math.PI * 2; // clockwise
            gfx.moveTo(ind.cx, ind.cy);
            gfx.arc(ind.cx, ind.cy, ind.radius, startAngle, endAngle, false);
            gfx.closePath();
            gfx.fillPath();

            // White border ring
            if (!isMobile) {
                gfx.lineStyle(2, 0xffffff, 0.5);
                gfx.strokeCircle(ind.cx, ind.cy, ind.radius);
            }
        });
    }

    private createMobileControls() {
        // Transparent background for controls
        const controlsBg = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.height - 75, this.cameras.main.width, 150, 0xd2b48c, 0);
        controlsBg.setDepth(100);

        // Map to keyboard events for FightScene to pick up
        const simulateKey = (key: string, isDown: boolean) => {
            const event = new KeyboardEvent(isDown ? 'keydown' : 'keyup', { key });
            window.dispatchEvent(event);
            // In Phaser, we might need to directly manipulate the keys object in FightScene
            const keys = (this.fightScene as any).keys;
            if (keys && keys[key]) {
                keys[key].isDown = isDown;
            }
        };

        // Left side: virtual joystick for movement (replaces arrow buttons)
        this.createJoystick(simulateKey);

        // Right side: attacks
        const punchBtn = this.add.image(this.cameras.main.width - 600, this.cameras.main.height - 80, 'mobile_fist').setInteractive().setAlpha(0.9).setDepth(101).setScale(0.03);
        const kickBtn = this.add.image(this.cameras.main.width - 450, this.cameras.main.height - 80, 'mobile_leg').setInteractive().setAlpha(0.9).setDepth(101).setScale(0.2);
        const bananaBtn = this.add.image(this.cameras.main.width - 300, this.cameras.main.height - 80, 'mobile_pill').setInteractive().setAlpha(0.9).setDepth(101).setScale(0.2);
        const dynamiteBtn = this.add.image(this.cameras.main.width - 150, this.cameras.main.height - 80, 'dynamite').setInteractive().setAlpha(0.9).setDepth(101).setScale(0.15);

        this.mobileButtons = {
            punch: punchBtn,
            kick: kickBtn,
            banana: bananaBtn,
            dynamite: dynamiteBtn
        };

        punchBtn.on('pointerdown', () => { punchBtn.setAlpha(1); simulateKey('ENTER', true); }).on('pointerup', () => { punchBtn.setAlpha(0.7); simulateKey('ENTER', false); }).on('pointerout', () => { punchBtn.setAlpha(0.7); simulateKey('ENTER', false); });
        kickBtn.on('pointerdown', () => { kickBtn.setAlpha(1); simulateKey('SHIFT', true); }).on('pointerup', () => { kickBtn.setAlpha(0.7); simulateKey('SHIFT', false); }).on('pointerout', () => { kickBtn.setAlpha(0.7); simulateKey('SHIFT', false); });
        bananaBtn.on('pointerdown', () => { bananaBtn.setAlpha(1); simulateKey('SPACE', true); }).on('pointerup', () => { bananaBtn.setAlpha(0.7); simulateKey('SPACE', false); }).on('pointerout', () => { bananaBtn.setAlpha(0.7); simulateKey('SPACE', false); });
        dynamiteBtn.on('pointerdown', () => { dynamiteBtn.setAlpha(1); simulateKey('SPACE', true); simulateKey('ENTER', true); }).on('pointerup', () => { dynamiteBtn.setAlpha(0.7); simulateKey('SPACE', false); simulateKey('ENTER', false); }).on('pointerout', () => { dynamiteBtn.setAlpha(0.7); simulateKey('SPACE', false); simulateKey('ENTER', false); });
    }

    private createJoystick(simulateKey: (key: string, isDown: boolean) => void) {
        const baseX = 130;
        const baseY = this.cameras.main.height - 110;
        const baseRadius = 80;
        const thumbRadius = 40;
        const deadZone = 18;      // ignore tiny movements
        const jumpThreshold = 35; // upward distance to trigger jump

        // Joystick base
        this.add.circle(baseX, baseY, baseRadius, 0x000000, 0.35)
            .setStrokeStyle(4, 0xffffff, 0.4)
            .setDepth(101);
        // Joystick thumb
        const thumb = this.add.circle(baseX, baseY, thumbRadius, 0xffffff, 0.6)
            .setStrokeStyle(3, 0x000000, 0.5)
            .setDepth(102);

        // Interactive zone covering the joystick area so it can be grabbed anywhere near it
        const zone = this.add.zone(baseX, baseY, baseRadius * 4, baseRadius * 4)
            .setOrigin(0.5)
            .setInteractive()
            .setDepth(101);

        // Track which directional keys are currently held by the joystick
        const state = { left: false, right: false, up: false };

        const setDir = (left: boolean, right: boolean, up: boolean) => {
            if (left !== state.left) { simulateKey('A', left); state.left = left; }
            if (right !== state.right) { simulateKey('D', right); state.right = right; }
            if (up !== state.up) { simulateKey('W', up); state.up = up; }
        };

        const resetThumb = () => {
            thumb.setPosition(baseX, baseY);
            setDir(false, false, false);
        };

        const updateThumb = (pointer: Phaser.Input.Pointer) => {
            let dx = pointer.x - baseX;
            let dy = pointer.y - baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Clamp the thumb inside the base radius
            if (dist > baseRadius) {
                dx = (dx / dist) * baseRadius;
                dy = (dy / dist) * baseRadius;
            }
            thumb.setPosition(baseX + dx, baseY + dy);

            // Horizontal direction
            let left = false;
            let right = false;
            if (Math.abs(dx) > deadZone) {
                left = dx < 0;
                right = dx > 0;
            }
            // Vertical (jump) direction
            const up = dy < -jumpThreshold;

            setDir(left, right, up);
        };

        let activePointerId: number | null = null;

        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            activePointerId = pointer.id;
            updateThumb(pointer);
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (activePointerId === pointer.id && pointer.isDown) {
                updateThumb(pointer);
            }
        });

        const release = (pointer: Phaser.Input.Pointer) => {
            if (activePointerId === pointer.id) {
                activePointerId = null;
                resetThumb();
            }
        };

        this.input.on('pointerup', release);
        this.input.on('pointerupoutside', release);
    }
}
