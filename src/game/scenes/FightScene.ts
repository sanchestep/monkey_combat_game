import Phaser from 'phaser';
import { fighters, getEnemyOrder } from '../config/fighters';
import { arenas } from '../config/arenas';
import { balance } from '../config/balance';
import { saveService } from '../services/SaveService';

export class FightScene extends Phaser.Scene {
    public playerFighterId!: string;
    public arenaId!: string;
    public enemyFighterId!: string;
    
    private player!: Phaser.Physics.Arcade.Sprite;
    private enemy!: Phaser.Physics.Arcade.Sprite;
    
    public static readonly MAX_HP = 500;

    private playerHp = FightScene.MAX_HP;
    private enemyHp = FightScene.MAX_HP;
    private currentStreak = 0;
    private difficulty = 'medium';
    
    public isGameOver = false;
    public isPaused = false;

    private keys!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
        UP: Phaser.Input.Keyboard.Key;
        LEFT: Phaser.Input.Keyboard.Key;
        RIGHT: Phaser.Input.Keyboard.Key;
        DOWN: Phaser.Input.Keyboard.Key;
        ENTER: Phaser.Input.Keyboard.Key;
        SHIFT: Phaser.Input.Keyboard.Key;
        SPACE: Phaser.Input.Keyboard.Key;
    };

    private playerCooldowns = { punch: 0, kick: 0, banana: 0, dynamite: 0 };
    private enemyCooldowns = { punch: 0, kick: 0, banana: 0, dynamite: 0 };

    private bananas!: Phaser.Physics.Arcade.Group;
    private dynamites!: Phaser.Physics.Arcade.Group;

    private enemyState: 'idle' | 'approach' | 'retreat' | 'attack' = 'idle';
    private enemyStateTimer: number = 0;

    constructor() {
        super('FightScene');
    }

    init(data: { playerFighterId: string, arenaId: string, currentStreak?: number, difficulty?: string }) {
        this.playerFighterId = data.playerFighterId;
        this.currentStreak = data.currentStreak || 0;
        this.difficulty = data.difficulty || 'medium';
        
        if (this.currentStreak > 0) {
            this.arenaId = arenas[Math.floor(Math.random() * arenas.length)].id;
        } else {
            this.arenaId = data.arenaId;
        }
        
        // Select enemy in order from weakest to strongest, ending with monkey_king (final boss).
        const enemyOrder = getEnemyOrder(this.playerFighterId);

        // Cycle through enemies based on the current streak
        if (enemyOrder.length > 0) {
            this.enemyFighterId = enemyOrder[this.currentStreak % enemyOrder.length];
        } else {
            this.enemyFighterId = 'monkey_king';
        }
    }

    create() {
        this.isGameOver = false;
        this.isPaused = true;
        this.playerHp = FightScene.MAX_HP;
        this.enemyHp = FightScene.MAX_HP;

        // Reset attack cooldowns so they don't carry over after death or victory
        this.playerCooldowns = { punch: 0, kick: 0, banana: 0, dynamite: 0 };
        this.enemyCooldowns = { punch: 0, kick: 0, banana: 0, dynamite: 0 };

        // Background
        const arena = arenas.find(a => a.id === this.arenaId)!;
        const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, arena.assetKey);
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        // Floor
        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
        const floorY = isMobile ? this.cameras.main.height - 160 : this.cameras.main.height - 10;
        const floor = this.add.rectangle(this.cameras.main.centerX, floorY, this.cameras.main.width, 20, 0x000000, 0);
        this.physics.add.existing(floor, true);

        // Fighters
        const pConfig = fighters.find(f => f.id === this.playerFighterId)!;
        const eConfig = fighters.find(f => f.id === this.enemyFighterId)!;

        this.player = this.physics.add.sprite(200, floorY - 90, pConfig.assetKey);
        this.player.setDisplaySize(150, 150);
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0);
        this.player.setData('config', pConfig);

        this.enemy = this.physics.add.sprite(this.cameras.main.width - 200, floorY - 90, eConfig.assetKey);
        this.enemy.setDisplaySize(150, 150);
        this.enemy.setCollideWorldBounds(true);
        this.enemy.setBounce(0);
        this.enemy.setFlipX(true);
        this.enemy.setData('config', eConfig);

        // Prevent jumping on heads
        (this.player.body as Phaser.Physics.Arcade.Body).checkCollision.up = false;
        (this.enemy.body as Phaser.Physics.Arcade.Body).checkCollision.up = false;

        this.physics.add.collider(this.player, floor);
        this.physics.add.collider(this.enemy, floor);
        this.physics.add.collider(this.player, this.enemy);

        // Projectiles
        this.bananas = this.physics.add.group();
        this.physics.add.collider(this.bananas, this.player, this.hitPlayerWithBanana, undefined, this);
        this.physics.add.collider(this.bananas, this.enemy, this.hitEnemyWithBanana, undefined, this);

        this.dynamites = this.physics.add.group();
        this.physics.add.collider(this.dynamites, this.player, this.hitPlayerWithDynamite, undefined, this);
        this.physics.add.collider(this.dynamites, this.enemy, this.hitEnemyWithDynamite, undefined, this);

        // Input
        if (this.input.keyboard) {
            this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,RIGHT,DOWN,ENTER,SHIFT,SPACE') as any;
        }

        // UI Scene
        this.scene.launch('UIScene', { fightScene: this });
    }

    update(_time: number, delta: number) {
        if (this.isGameOver || this.isPaused) return;

        this.updateCooldowns(delta);
        this.handlePlayerInput();
        this.handleEnemyAI(delta);
        this.cleanupProjectiles();
    }

    // Method to pause the game
    public pauseGame() {
        this.isPaused = true;
        this.scene.pause();
    }

    // Method to resume the game
    public resumeGame() {
        this.isPaused = false;
        this.scene.resume();
    }

    private cleanupProjectiles() {
        this.bananas.getChildren().forEach((b: any) => {
            if (b.x < -100 || b.x > this.cameras.main.width + 100) {
                b.destroy();
            }
        });
        this.dynamites.getChildren().forEach((d: any) => {
            if (d.x < -100 || d.x > this.cameras.main.width + 100) {
                d.destroy();
            }
        });
    }

    private updateCooldowns(delta: number) {
        if (this.playerCooldowns.punch > 0) this.playerCooldowns.punch -= delta;
        if (this.playerCooldowns.kick > 0) this.playerCooldowns.kick -= delta;
        if (this.playerCooldowns.banana > 0) this.playerCooldowns.banana -= delta;
        if (this.playerCooldowns.dynamite > 0) this.playerCooldowns.dynamite -= delta;

        if (this.enemyCooldowns.punch > 0) this.enemyCooldowns.punch -= delta;
        if (this.enemyCooldowns.kick > 0) this.enemyCooldowns.kick -= delta;
        if (this.enemyCooldowns.banana > 0) this.enemyCooldowns.banana -= delta;
        if (this.enemyCooldowns.dynamite > 0) this.enemyCooldowns.dynamite -= delta;
    }

    private handlePlayerInput() {
        if (!this.keys) return;

        const pConfig = this.player.getData('config');
        const speed = balance.movement.speed * pConfig.gameplayModifiers.moveSpeedMultiplier;

        if (this.keys.A.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (this.keys.D.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.keys.W.isDown && this.player.body?.touching.down) {
            this.player.setVelocityY(balance.movement.jumpVelocity * pConfig.gameplayModifiers.jumpMultiplier);
        }

        const spaceDown = this.keys.SPACE.isDown;
        const enterDown = this.keys.ENTER.isDown;

        if (spaceDown && enterDown && this.playerCooldowns.dynamite <= 0) {
            this.throwDynamite(this.player, this.playerCooldowns);
        } else if (enterDown && !spaceDown && this.playerCooldowns.punch <= 0) {
            this.performAttack(this.player, this.enemy, 'punch', this.playerCooldowns);
        } else if (this.keys.SHIFT.isDown && this.playerCooldowns.kick <= 0) {
            this.performAttack(this.player, this.enemy, 'kick', this.playerCooldowns);
        } else if (spaceDown && !enterDown && this.playerCooldowns.banana <= 0) {
            this.throwBanana(this.player, this.playerCooldowns);
        }
    }

    private getDifficultyMultiplier() {
        switch (this.difficulty) {
            case 'easy': return { enemyDamage: 0.7, enemySpeed: 0.88, playerDamage: 1.3 };
            case 'hard': return { enemyDamage: 1.1, enemySpeed: 1.15, playerDamage: 0.85 };
            case 'medium':
            default: return { enemyDamage: 0.9, enemySpeed: 1.0, playerDamage: 1.15 };
        }
    }

    private handleEnemyAI(delta: number) {
        const eConfig = this.enemy.getData('config');
        const diffMult = this.getDifficultyMultiplier();
        const speed = balance.movement.speed * eConfig.gameplayModifiers.moveSpeedMultiplier * diffMult.enemySpeed;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
        const dx = this.player.x - this.enemy.x;
        const dy = this.player.y - this.enemy.y;

        // Face player
        this.enemy.setFlipX(dx < 0);

        this.enemyStateTimer -= delta;

        // Determine difficulty-based AI parameters (medium defaults)
        let reactionTime = 230;
        let aggression = 0.75;
        let retreatChance = 0.08;
        let jumpChance = 0.15;

        if (this.difficulty === 'easy') {
            reactionTime = 300;
            aggression = 0.65;
            retreatChance = 0.11;
            jumpChance = 0.08;
        } else if (this.difficulty === 'hard') {
            reactionTime = 130;
            aggression = 0.8;
            retreatChance = 0.05;
            jumpChance = 0.2;
        }

        // Force attack state if close and approaching
        if (this.enemyState === 'approach' && dist <= 160) {
            this.enemyState = 'attack';
            this.enemyStateTimer = reactionTime;
        }

        // State transitions
        if (this.enemyStateTimer <= 0) {
            this.enemyStateTimer = reactionTime + Math.random() * 100;
            
            if (dist < 160) {
                if (Math.random() < aggression) {
                    this.enemyState = 'attack';
                } else if (Math.random() < retreatChance) {
                    this.enemyState = 'retreat';
                } else {
                    this.enemyState = 'idle';
                }
            } else if (dist > 300) {
                if (Math.random() < aggression) {
                    this.enemyState = 'approach';
                } else {
                    this.enemyState = 'idle';
                }
            } else {
                // Mid range
                const r = Math.random();
                if (r < aggression * 0.8) {
                    this.enemyState = 'approach';
                } else if (r < aggression * 0.8 + retreatChance) {
                    this.enemyState = 'retreat';
                } else {
                    this.enemyState = 'idle';
                }
            }
        }

        // Evade projectiles (dynamites and bananas)
        let projectileIncoming = false;
        this.bananas.getChildren().forEach((b: any) => {
            if (b.active && b.getData('owner') === this.player) {
                const bDist = Phaser.Math.Distance.Between(b.x, b.y, this.enemy.x, this.enemy.y);
                if (bDist < 250 && ((b.body.velocity.x > 0 && this.enemy.x > b.x) || (b.body.velocity.x < 0 && this.enemy.x < b.x))) {
                    projectileIncoming = true;
                }
            }
        });
        this.dynamites.getChildren().forEach((d: any) => {
            if (d.active && d.getData('owner') === this.player) {
                const dDist = Phaser.Math.Distance.Between(d.x, d.y, this.enemy.x, this.enemy.y);
                if (dDist < 250 && ((d.body.velocity.x > 0 && this.enemy.x > d.x) || (d.body.velocity.x < 0 && this.enemy.x < d.x))) {
                    projectileIncoming = true;
                }
            }
        });

        if (projectileIncoming && this.enemy.body?.touching.down && Math.random() < (this.difficulty === 'hard' ? 0.8 : 0.3)) {
            this.enemy.setVelocityY(balance.movement.jumpVelocity * eConfig.gameplayModifiers.jumpMultiplier);
        }

        // Jump if player is high up
        if (dy < -100 && this.enemy.body?.touching.down && Math.random() < jumpChance) {
            this.enemy.setVelocityY(balance.movement.jumpVelocity * eConfig.gameplayModifiers.jumpMultiplier);
        }

        // Execute state
        switch (this.enemyState) {
            case 'idle':
                this.enemy.setVelocityX(0);
                // Randomly throw projectiles if far
                if (dist > 200) {
                    if (this.enemyCooldowns.dynamite <= 0 && Math.random() < 0.1 * aggression) {
                        this.throwDynamite(this.enemy, this.enemyCooldowns);
                    } else if (this.enemyCooldowns.banana <= 0 && Math.random() < 0.2 * aggression) {
                        this.throwBanana(this.enemy, this.enemyCooldowns);
                    }
                }
                break;
            case 'approach':
                this.enemy.setVelocityX(dx > 0 ? speed : -speed);
                if (dist > 250 && this.enemyCooldowns.banana <= 0 && Math.random() < 0.15 * aggression) {
                    this.throwBanana(this.enemy, this.enemyCooldowns);
                }
                break;
            case 'retreat':
                this.enemy.setVelocityX(dx > 0 ? -speed * 0.8 : speed * 0.8);
                break;
            case 'attack':
                if (dist > 160) {
                    // Подойти ближе для атаки
                    this.enemy.setVelocityX(dx > 0 ? speed : -speed);
                } else {
                    this.enemy.setVelocityX(0);
                    if (this.enemyCooldowns.punch <= 0 && Math.random() < aggression) {
                        this.performAttack(this.enemy, this.player, 'punch', this.enemyCooldowns);
                    } else if (this.enemyCooldowns.kick <= 0 && Math.random() < aggression) {
                        this.performAttack(this.enemy, this.player, 'kick', this.enemyCooldowns);
                    }
                }
                break;
        }
    }

    /**
     * Safely play a sound effect. If the audio key failed to load/decode it is
     * simply skipped instead of throwing, which would otherwise crash the
     * Phaser update loop and freeze the whole game.
     */
    private playSfx(key: string) {
        try {
            if (this.cache.audio.exists(key)) {
                this.sound.play(key);
            }
        } catch (e) {
            console.warn(`Не удалось воспроизвести звук "${key}"`, e);
        }
    }

    private performAttack(attacker: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite, type: 'punch' | 'kick', cooldowns: any) {
        const config = attacker.getData('config');
        const attackConfig = balance[type];
        
        cooldowns[type] = attackConfig.cooldown;

        // Play sound
        this.playSfx(type === 'punch' ? 'fist' : 'leg');

        // Visual feedback
        const attackImageKey = type === 'punch' ? `${config.id}_fist` : `${config.id}_leg`;
        const originalKey = config.assetKey;
        
        attacker.setTexture(attackImageKey);
        attacker.setDisplaySize(150, 150);
        
        this.time.delayedCall(200, () => {
            if (attacker.active) {
                const isPlayer = attacker === this.player;
                const hp = isPlayer ? this.playerHp : this.enemyHp;
                if (hp > 0) {
                    attacker.setTexture(originalKey);
                    attacker.setDisplaySize(150, 150);
                }
            }
        });

        const dist = Phaser.Math.Distance.Between(attacker.x, attacker.y, target.x, target.y);
        const isFacingTarget = attacker.flipX ? attacker.x > target.x : attacker.x < target.x;

        if (dist <= attackConfig.range && isFacingTarget) {
            let damage = attackConfig.damage * (type === 'punch' ? config.gameplayModifiers.punchDamageMultiplier : config.gameplayModifiers.kickDamageMultiplier);
            
            const diffMult = this.getDifficultyMultiplier();
            if (attacker === this.player) {
                damage *= diffMult.playerDamage;
            } else {
                damage *= diffMult.enemyDamage;
            }

            this.applyDamage(target, damage);
        }
    }

    private throwBanana(attacker: Phaser.Physics.Arcade.Sprite, cooldowns: any) {
        cooldowns.banana = balance.banana.cooldown;
        
        // Play sound
        this.playSfx('banana');

        const banana = this.bananas.create(attacker.x, attacker.y, 'banana_img') as Phaser.Physics.Arcade.Sprite;
        banana.setDisplaySize(40, 40);
        banana.setData('owner', attacker);
        
        const direction = attacker.flipX ? -1 : 1;
        banana.setVelocityX(balance.banana.speed * direction);
        (banana.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }

    private hitPlayerWithBanana(player: any, banana: any) {
        if (!banana.active) return;
        const owner = banana.getData('owner');
        if (owner !== player) {
            const config = owner.getData('config');
            this.showPillEffect(banana.x, banana.y);
            banana.setActive(false).setVisible(false);
            banana.destroy();
            let damage = balance.banana.damage * config.gameplayModifiers.bananaDamageMultiplier;
            damage *= this.getDifficultyMultiplier().enemyDamage;
            this.applyDamage(player, damage);
        }
    }

    private hitEnemyWithBanana(enemy: any, banana: any) {
        if (!banana.active) return;
        const owner = banana.getData('owner');
        if (owner !== enemy) {
            const config = owner.getData('config');
            this.showPillEffect(banana.x, banana.y);
            banana.setActive(false).setVisible(false);
            banana.destroy();
            let damage = balance.banana.damage * config.gameplayModifiers.bananaDamageMultiplier;
            damage *= this.getDifficultyMultiplier().playerDamage;
            this.applyDamage(enemy, damage);
        }
    }

    private throwDynamite(attacker: Phaser.Physics.Arcade.Sprite, cooldowns: any) {
        cooldowns.dynamite = balance.dynamite.cooldown;
        
        const dynamite = this.dynamites.create(attacker.x, attacker.y, 'dynamite') as Phaser.Physics.Arcade.Sprite;
        dynamite.setDisplaySize(40, 40);
        dynamite.setData('owner', attacker);
        
        const direction = attacker.flipX ? -1 : 1;
        dynamite.setVelocityX(balance.dynamite.speed * direction);
        (dynamite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }

    private hitPlayerWithDynamite(player: any, dynamite: any) {
        if (!dynamite.active) return;
        const owner = dynamite.getData('owner');
        if (owner !== player) {
            this.showBoomEffect(dynamite.x, dynamite.y);
            dynamite.setActive(false).setVisible(false);
            dynamite.destroy();
            let damage = balance.dynamite.damage;
            damage *= this.getDifficultyMultiplier().enemyDamage;
            this.applyDamage(player, damage);
        }
    }

    private hitEnemyWithDynamite(enemy: any, dynamite: any) {
        if (!dynamite.active) return;
        const owner = dynamite.getData('owner');
        if (owner !== enemy) {
            this.showBoomEffect(dynamite.x, dynamite.y);
            dynamite.setActive(false).setVisible(false);
            dynamite.destroy();
            let damage = balance.dynamite.damage;
            damage *= this.getDifficultyMultiplier().playerDamage;
            this.applyDamage(enemy, damage);
        }
    }

    private showBoomEffect(x: number, y: number) {
        const boom = this.add.image(x, y, 'boom');
        boom.setDisplaySize(100, 100);
        this.time.delayedCall(500, () => {
            if (boom.active) boom.destroy();
        });
    }

    private showPillEffect(x: number, y: number) {
        const pill = this.add.image(x, y, 'pill');
        pill.setDisplaySize(50, 50);
        this.time.delayedCall(500, () => {
            if (pill.active) pill.destroy();
        });
    }

    private applyDamage(target: Phaser.Physics.Arcade.Sprite, amount: number) {
        if (target === this.player) {
            this.playerHp = Math.max(0, this.playerHp - amount);
        } else {
            this.enemyHp = Math.max(0, this.enemyHp - amount);
        }

        // Flash red
        target.setTint(0xff0000);
        this.time.delayedCall(100, () => target.clearTint());

        // Knockback
        const direction = target.x > (target === this.player ? this.enemy.x : this.player.x) ? 1 : -1;
        target.setVelocityX(200 * direction);
        target.setVelocityY(-200);

        // Update UI
        this.events.emit('hp-changed', { playerHp: this.playerHp, enemyHp: this.enemyHp });

        if (this.playerHp <= 0 || this.enemyHp <= 0) {
            this.endRound();
        }
    }

    private endRound() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();

        if (this.playerHp <= 0) {
            const config = this.player.getData('config');
            this.player.setTexture(`${config.id}_fall`);
            this.player.setDisplaySize(150, 150);
        }
        
        if (this.enemyHp <= 0) {
            const config = this.enemy.getData('config');
            this.enemy.setTexture(`${config.id}_fall`);
            this.enemy.setDisplaySize(150, 150);
        }

        if (this.playerHp > 0) {
            this.currentStreak++;
            saveService.setBestStreak(this.currentStreak);
            this.events.emit('round-end', { winner: 'player', streak: this.currentStreak, enemyId: this.enemyFighterId });
        } else {
            this.events.emit('round-end', { winner: 'enemy', streak: this.currentStreak, bestStreak: saveService.bestStreak });
        }
    }

    public getPlayerHp() { return this.playerHp; }
    public getEnemyHp() { return this.enemyHp; }
    public getCurrentStreak() { return this.currentStreak; }
    public getDifficulty() { return this.difficulty; }
    public getPlayerCooldowns() { return this.playerCooldowns; }
    
    public startFight() {
        this.isPaused = false;
    }
}

