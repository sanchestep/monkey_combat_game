import { yandexSdkService } from './YandexSdkService';

export interface SaveData {
    bestStreak: number;
    isMusicMuted: boolean;
    unlockedFighters: string[];
    lastSelectedFighterId?: string;
    lastSelectedArenaId?: string;
}

const DEFAULT_SAVE: SaveData = {
    bestStreak: 0,
    isMusicMuted: false,
    unlockedFighters: ['capuchin', 'chimpanzee', 'gorilla', 'mandrill', 'nose', 'orange', 'orangutan', 'spider_monkey', 'tamarin', 'tibetan_macaque']
};

export class SaveService {
    private data: SaveData = { ...DEFAULT_SAVE };
    private readonly LOCAL_KEY = 'monkey_kombat_save';

    async init() {
        // Load local
        const localStr = localStorage.getItem(this.LOCAL_KEY);
        if (localStr) {
            try {
                const localData = JSON.parse(localStr);
                this.data = { ...DEFAULT_SAVE, ...localData };
                
                // Ensure default fighters are always unlocked (e.g. for new free characters added later)
                const mergedLocalFighters = new Set([...DEFAULT_SAVE.unlockedFighters, ...(localData.unlockedFighters || [])]);
                this.data.unlockedFighters = Array.from(mergedLocalFighters);
            } catch (e) {
                console.error('Не удалось разобрать локальные сохранения', e);
            }
        }

        try {
            // Load cloud with timeout
            const cloudData = await Promise.race([
                yandexSdkService.getCloudData(),
                new Promise((resolve) => setTimeout(() => resolve(null), 2000))
            ]);
            
            if (cloudData) {
                this.data.bestStreak = Math.max(this.data.bestStreak, cloudData.bestStreak || 0);
                this.data.isMusicMuted = cloudData.isMusicMuted ?? this.data.isMusicMuted;
                
                const cloudFighters = cloudData.unlockedFighters || [];
                const mergedFighters = new Set([...this.data.unlockedFighters, ...cloudFighters]);
                this.data.unlockedFighters = Array.from(mergedFighters);
                
                this.data.lastSelectedFighterId = cloudData.lastSelectedFighterId || this.data.lastSelectedFighterId;
                this.data.lastSelectedArenaId = cloudData.lastSelectedArenaId || this.data.lastSelectedArenaId;
            }
        } catch (e) {
            console.warn('Загрузка данных из облака не удалась', e);
        }

        try {
            // Check purchases with timeout
            const purchases = await Promise.race([
                yandexSdkService.getPurchases(),
                new Promise((resolve) => setTimeout(() => resolve([]), 2000))
            ]);
            
            if (Array.isArray(purchases) && purchases.includes('monkey_king') && !this.data.unlockedFighters.includes('monkey_king')) {
                this.data.unlockedFighters.push('monkey_king');
            }
            if (Array.isArray(purchases) && purchases.includes('cacajao') && !this.data.unlockedFighters.includes('cacajao')) {
                this.data.unlockedFighters.push('cacajao');
            }
            if (Array.isArray(purchases) && purchases.includes('tibetan_macaque') && !this.data.unlockedFighters.includes('tibetan_macaque')) {
                this.data.unlockedFighters.push('tibetan_macaque');
            }
        } catch (e) {
            console.warn('Проверка покупок не удалась', e);
        }

        await this.save();
    }

    get bestStreak() { return this.data.bestStreak; }
    get isMusicMuted() { return this.data.isMusicMuted; }
    get unlockedFighters() { return this.data.unlockedFighters; }
    get lastSelectedFighterId() { return this.data.lastSelectedFighterId; }
    get lastSelectedArenaId() { return this.data.lastSelectedArenaId; }

    async setBestStreak(streak: number) {
        if (streak > this.data.bestStreak) {
            this.data.bestStreak = streak;
            await this.save();
        }
    }

    async setMusicMuted(muted: boolean) {
        this.data.isMusicMuted = muted;
        await this.save();
    }

    async unlockFighter(id: string) {
        if (!this.data.unlockedFighters.includes(id)) {
            this.data.unlockedFighters.push(id);
            await this.save();
        }
    }

    async setLastSelectedFighterId(id: string) {
        this.data.lastSelectedFighterId = id;
        await this.save();
    }

    async setLastSelectedArenaId(id: string) {
        this.data.lastSelectedArenaId = id;
        await this.save();
    }

    private async save() {
        localStorage.setItem(this.LOCAL_KEY, JSON.stringify(this.data));
        await yandexSdkService.setCloudData(this.data);
    }
}

export const saveService = new SaveService();
