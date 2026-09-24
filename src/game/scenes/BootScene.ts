import Phaser from 'phaser';
import { saveService } from '../services/SaveService';
import { audioService } from '../services/AudioService';
import { localizationService } from '../services/LocalizationService';
import { yandexSdkService } from '../services/YandexSdkService';

export class BootScene extends Phaser.Scene {
    private progressBar?: Phaser.GameObjects.Graphics;
    private progressBox?: Phaser.GameObjects.Graphics;
    private percentText?: Phaser.GameObjects.Text;

    constructor() {
        super('BootScene');
    }

    private showLoadingUI() {
        const { width, height } = this.scale;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x0a0503, 1);
        bg.fillRect(0, 0, width, height);

        // Title
        this.add.text(width / 2, height / 2 - 120, 'MONKEY KOMBAT', {
            fontFamily: 'Trebuchet MS, Arial, sans-serif',
            fontSize: '56px',
            fontStyle: 'bold',
            color: '#ffd27f',
            stroke: '#3a1f08',
            strokeThickness: 6,
        }).setOrigin(0.5);

        // Progress bar frame
        const barWidth = 600;
        const barHeight = 36;
        const barX = (width - barWidth) / 2;
        const barY = height / 2;

        this.progressBox = this.add.graphics();
        this.progressBox.lineStyle(3, 0xffb347, 1);
        this.progressBox.fillStyle(0x222222, 0.85);
        this.progressBox.fillRoundedRect(barX, barY, barWidth, barHeight, 8);
        this.progressBox.strokeRoundedRect(barX, barY, barWidth, barHeight, 8);

        this.progressBar = this.add.graphics();

        this.percentText = this.add.text(width / 2, barY + barHeight + 30, '0%', {
            fontFamily: 'Trebuchet MS, Arial, sans-serif',
            fontSize: '22px',
            color: '#ffd27f',
        }).setOrigin(0.5);

        const loadingText = this.add.text(width / 2, barY - 30, 'Загрузка...', {
            fontFamily: 'Trebuchet MS, Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5);

        this.load.on('progress', (value: number) => {
            if (!this.progressBar) return;
            this.progressBar.clear();
            this.progressBar.fillStyle(0xffb347, 1);
            this.progressBar.fillRoundedRect(
                barX + 4,
                barY + 4,
                (barWidth - 8) * value,
                barHeight - 8,
                6
            );
            if (this.percentText) {
                this.percentText.setText(`${Math.round(value * 100)}%`);
            }
        });

        this.load.on('complete', () => {
            this.progressBar?.destroy();
            this.progressBox?.destroy();
            this.percentText?.destroy();
            loadingText.destroy();
        });
    }

    preload() {
        // Hide HTML loading screen
        const htmlLoader = document.getElementById('boot-loader');
        if (htmlLoader) {
            htmlLoader.classList.add('hidden');
            setTimeout(() => htmlLoader.remove(), 500);
        }

        this.showLoadingUI();

        // Load CRITICAL assets first (needed for main menu)
        this.load.image('main_background', 'main_background.webp');
        
        // Load UI assets (needed immediately)
        this.load.image('sound_on', 'sound_on.png');
        this.load.image('sound_off', 'sound_off.png');
        
        // Load essential sounds
        this.load.audio('fist', 'fist.wav');
        this.load.audio('leg', 'leg.wav');
        this.load.audio('banana', 'banana.mp3');
        
        // Load first music track only (others loaded lazily)
        this.load.audio('music_first', 'music/first.mp3');

        // Load remaining assets
        this.loadDeferredAssets();
    }

    async create() {
        // Initialize services in parallel
        await Promise.allSettled([
            saveService.init(),
            localizationService.init(),
            audioService.init(this.game)
        ]);

        // Notify Yandex SDK that the game is ready
        try {
            yandexSdkService.gameReady();
        } catch (e) {
            console.warn('Yandex SDK gameReady не удался', e);
        }

        // Start main menu
        this.scene.start('MainMenuScene');
        this.scene.launch('OverlayScene');
    }

    private loadDeferredAssets() {
        // Load arenas
        this.load.image('jungle_forest_background', 'arena/jungle_forest_background.webp');
        this.load.image('mountain_background', 'arena/mountain_background.webp');
        this.load.image('river_background', 'arena/river_background.webp');
        this.load.image('temple_background', 'arena/temple_background.webp');
        this.load.image('volcano', 'arena/volcano.webp');
        this.load.image('beach', 'arena/beach.webp');

        // Background for the TreeScene progression map
        this.load.image('beach_tree', 'beach_tree.webp');

        // Load palm tree pieces (used by TreeScene to build the progression tree)
        for (let i = 1; i <= 14; i++) {
            this.load.image(`palm${i}`, `palm/palm${i}.png`);
        }

        // Load monkeys
        const monkeys = [
            { id: 'capuchin', folder: 'capuchin', file: 'capuchin', fist: 'capuchin-fist-Photoroom', leg: 'capuchin-leg-Photoroom', fall: 'capuchin-fall-Photoroom' },
            { id: 'chimpanzee', folder: 'chimpanzee', file: 'chimpanzee', fist: 'chimpanzee-fist-Photoroom', leg: 'chimpanzee-leg-Photoroom', fall: 'chimpanzee-fall-Photoroom' },
            { id: 'gorilla', folder: 'gorilla', file: 'gorilla', fist: 'gorilla-fist-Photoroom', leg: 'gorilla-leg-Photoroom', fall: 'gorilla-fall-Photoroom' },
            { id: 'mandrill', folder: 'mandrill', file: 'mandrill', fist: 'mandrill-fist-Photoroom', leg: 'mandrill-leg-Photoroom', fall: 'mandrill-fall-Photoroom' },
            { id: 'monkey_king', folder: 'monkey_king', file: 'monkey_king', fist: 'monkey-king-fist-Photoroom', leg: 'monkey-king-leg-Photoroom', fall: 'king-fall-Photoroom' },
            { id: 'nose', folder: 'nose', file: 'nose', fist: 'nose-fist-Photoroom', leg: 'nose-leg-Photoroom', fall: 'nose-fall-Photoroom' },
            { id: 'orange', folder: 'orange', file: 'orange', fist: 'orange-fist-Photoroom', leg: 'orange-leg-Photoroom', fall: 'orange-fall-Photoroom' },
            { id: 'orangutan', folder: 'orangutan', file: 'orangutan', fist: 'orangutan-fist-Photoroom', leg: 'orangutan-leg-Photoroom', fall: 'orangutan-fall-Photoroom' },
            { id: 'spider_monkey', folder: 'spider_monkey', file: 'spider-monkey', fist: 'spider-fist-Photoroom', leg: 'spider-leg-Photoroom', fall: 'spider-fall-Photoroom' },
            { id: 'cacajao', folder: 'cacajao', file: 'cacajao-Photoroom', fist: 'cacajao-fist-Photoroom', leg: 'cacajao-leg-Photoroom', fall: 'cacajao-fall-Photoroom' },
            { id: 'tamarin', folder: 'tamarin', file: 'tamarin-Photoroom', fist: 'tamarin-fist-Photoroom', leg: 'tamarin-leg-Photoroom', fall: 'tamarin-fall-Photoroom' },
            { id: 'tibetan_macaque', folder: 'tibetan_macaque', file: 'tibetan_macaque', fist: 'tibetan_macaque_fist', leg: 'tibetan_macaque_leg', fall: 'tibetan_macaque_fall' }
        ];

        monkeys.forEach(m => {
            this.load.image(m.id, `monkeys/${m.folder}/${m.file}.png`);
            this.load.image(`${m.id}_fist`, `monkeys/${m.folder}/${m.fist}.png`);
            this.load.image(`${m.id}_leg`, `monkeys/${m.folder}/${m.leg}.png`);
            this.load.image(`${m.id}_fall`, `monkeys/${m.folder}/${m.fall}.png`);
        });

        // Load remaining music
        this.load.audio('music_second', 'music/second.mp3');
        this.load.audio('music_third', 'music/third.mp3');
        this.load.audio('music_fourth', 'music/fourth.mp3');
        this.load.audio('music_fifth', 'music/fifth.mp3');
        this.load.audio('music_sixth', 'music/sixth.mp3');
        // Load remaining images
        this.load.image('banana_img', 'banana.png');
        this.load.image('restart', 'restart.png');
        this.load.image('counter', 'counter.png');
        this.load.image('dynamite', 'dynamite.png');
        this.load.image('boom', 'boom.png');
        this.load.image('pill', 'pill.png');

        // Load mobile controls
        this.load.image('mobile_left', 'mobile_movement/left.png');
        this.load.image('mobile_right', 'mobile_movement/right.png');
        this.load.image('mobile_up', 'mobile_movement/up.png');
        this.load.image('mobile_fist', 'mobile_movement/fist.png');
        this.load.image('mobile_leg', 'mobile_movement/leg.png');
        this.load.image('mobile_pill', 'mobile_movement/pill.png');
    }
}
