import Phaser from 'phaser';
import { saveService } from './SaveService';

export class AudioService {
    private game: Phaser.Game | null = null;
    private currentTrack: Phaser.Sound.BaseSound | null = null;
    private tracks = ['music_first', 'music_second', 'music_third', 'music_fourth', 'music_fifth', 'music_sixth'];
    private lastTrackIndex = -1;

    init(game: Phaser.Game) {
        this.game = game;
        try {
            this.game.sound.mute = saveService.isMusicMuted;
            this.playNextTrack();
            
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.game?.sound.pauseAll();
                } else {
                    this.game?.sound.resumeAll();
                }
            });
        } catch (e) {
            console.warn('Ошибка инициализации аудио', e);
        }
    }

    playNextTrack() {
        if (!this.game) return;

        // Only consider tracks that actually loaded and decoded successfully.
        // Failed/missing audio (e.g. a 404 or undecodable file) is skipped so a
        // bad track never throws "Audio key not found in cache".
        const availableTracks = this.tracks.filter(key => this.game!.cache.audio.exists(key));
        if (availableTracks.length === 0) {
            return;
        }

        let nextIndex = Math.floor(Math.random() * availableTracks.length);
        if (availableTracks.length > 1 && nextIndex === this.lastTrackIndex) {
            nextIndex = (nextIndex + 1) % availableTracks.length;
        }

        this.lastTrackIndex = nextIndex;
        const trackKey = availableTracks[nextIndex];

        try {
            if (this.currentTrack) {
                this.currentTrack.stop();
            }

            this.currentTrack = this.game.sound.add(trackKey);
            this.currentTrack.play();

            this.currentTrack.once('complete', () => {
                this.playNextTrack();
            });
        } catch (e) {
            console.warn(`Не удалось воспроизвести трек "${trackKey}"`, e);
        }
    }

    toggleMute() {
        if (!this.game) return;
        this.game.sound.mute = !this.game.sound.mute;
        saveService.setMusicMuted(this.game.sound.mute);
    }

    isMuted() {
        return this.game?.sound.mute || false;
    }

    pause() {
        if (this.currentTrack && this.currentTrack.isPlaying) {
            this.currentTrack.pause();
        }
    }

    resume() {
        if (this.currentTrack && this.currentTrack.isPaused) {
            this.currentTrack.resume();
        }
    }

    pauseAll() {
        try {
            this.game?.sound.pauseAll();
        } catch (e) {
            console.warn('pauseAll не удался', e);
        }
    }

    resumeAll() {
        try {
            this.game?.sound.resumeAll();
        } catch (e) {
            console.warn('resumeAll не удался', e);
        }
    }
}

export const audioService = new AudioService();
