import { audioService } from './AudioService';

export class YandexSdkService {
    private ys: any = null;
    private player: any = null;
    private payments: any = null;
    public isReady = false;
    private lastAdTime: number = 0;

    gameReady() {
        if (this.ys) {
            try {
                this.ys.features?.LoadingAPI?.ready();
                console.log('Yandex SDK LoadingAPI.ready() called');
            } catch (e) {
                console.warn('LoadingAPI not available', e);
            }
        }
    }

    async init() {
        try {
            if (typeof window !== 'undefined' && (window as any).YaGames) {
                // Add timeout to prevent hanging
                this.ys = await Promise.race([
                    (window as any).YaGames.init(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Yandex SDK init timeout')), 5000))
                ]);
                (window as any).ysdk = this.ys;
            } else if (typeof window !== 'undefined' && (window as any).ysdk) {
                this.ys = (window as any).ysdk;
            }
            
            if (this.ys) {
                this.isReady = true;
                
                try {
                    // Add timeout for player initialization
                    this.player = await Promise.race([
                        this.ys.getPlayer({ scopes: false }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Player init timeout')), 2000))
                    ]);
                } catch (e) {
                    console.warn('Player not initialized', e);
                }
                
                try {
                    // Add timeout for payments initialization
                    this.payments = await Promise.race([
                        this.ys.getPayments({ signed: true }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Payments init timeout')), 2000))
                    ]);
                } catch (e) {
                    console.warn('Payments not initialized', e);
                }
            }
        } catch (e) {
            console.warn('Yandex SDK init failed, running in dev mode', e);
        }
    }

    async showInterstitialAd(force: boolean = false): Promise<boolean> {
        const now = Date.now();
        // Show ad if forced or if 3 minutes (180000 ms) have passed since last ad
        if (!force && now - this.lastAdTime < 180000) {
            console.log('Реклама пропущена: еще не прошло 3 минуты');
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            if (!this.ys) {
                console.log('Режим разработки: показана полноэкранная реклама');
                this.lastAdTime = Date.now();
                resolve(true);
                return;
            }

            let audioPaused = false;
            const pauseAudio = () => {
                if (!audioPaused) {
                    audioService.pauseAll();
                    audioPaused = true;
                }
            };
            const resumeAudio = () => {
                if (audioPaused) {
                    audioService.resumeAll();
                    audioPaused = false;
                }
            };

            this.ys.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        pauseAudio();
                    },
                    onClose: (wasShown: boolean) => {
                        resumeAudio();
                        this.lastAdTime = Date.now();
                        resolve(wasShown);
                    },
                    onError: (error: any) => {
                        console.error('Ошибка рекламы', error);
                        resumeAudio();
                        resolve(false);
                    }
                }
            });
        });
    }

    async showRewardedAd(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.ys) {
                console.log('Режим разработки: показана rewarded-реклама, награда выдана');
                resolve(true);
                return;
            }

            let audioPaused = false;
            let rewarded = false;
            const pauseAudio = () => {
                if (!audioPaused) {
                    audioService.pauseAll();
                    audioPaused = true;
                }
            };
            const resumeAudio = () => {
                if (audioPaused) {
                    audioService.resumeAll();
                    audioPaused = false;
                }
            };

            this.ys.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        pauseAudio();
                    },
                    onRewarded: () => {
                        rewarded = true;
                    },
                    onClose: () => {
                        resumeAudio();
                        resolve(rewarded);
                    },
                    onError: (error: any) => {
                        console.error('Ошибка rewarded-рекламы', error);
                        resumeAudio();
                        resolve(false);
                    }
                }
            });
        });
    }

    async showStickyBanner(): Promise<void> {
        if (!this.ys) {
            console.log('Режим разработки: показан sticky-баннер');
            return;
        }

        try {
            const { reason } = await this.ys.adv.showBannerAdv();
            if (reason) {
                console.log('Sticky-баннер не показан:', reason);
            }
        } catch (e) {
            console.error('Failed to show sticky banner', e);
        }
    }

    async hideStickyBanner(): Promise<void> {
        if (!this.ys) {
            console.log('Режим разработки: sticky-баннер скрыт');
            return;
        }

        try {
            await this.ys.adv.hideBannerAdv();
        } catch (e) {
            console.error('Не удалось скрыть sticky-баннер', e);
        }
    }

    async purchase(productId: string): Promise<boolean> {
        if (!this.ys || !this.payments) {
            console.log(`Режим разработки: Куплен ${productId}`);
            return true;
        }

        try {
            await this.payments.purchase({ id: productId });
            return true;
        } catch (e) {
            console.error('Покупка не удалась', e);
            return false;
        }
    }

    async getPurchases(): Promise<string[]> {
        if (!this.ys || !this.payments) {
            return [];
        }

        try {
            const purchases = await this.payments.getPurchases();
            return purchases.map((p: any) => p.productID);
        } catch (e) {
            console.error('Не удалось получить покупки', e);
            return [];
        }
    }

    /**
     * Returns the catalog of in-game products with prices in portal currency.
     * Each item contains: id, title, description, price (formatted string with currency, e.g. "10 YAN"),
     * priceValue (numeric string), priceCurrencyCode, and getPriceCurrencyImage(size) helper.
     * Required by Yandex Games moderation (item 1.13.4) — name/icon of the portal currency
     * must be shown alongside the numeric price and must be sourced from the SDK.
     */
    async getCatalog(): Promise<any[]> {
        if (!this.ys || !this.payments) {
            // Резервный вариант для режима разработки, чтобы UI по-прежнему отображал числовые цены в YAN.
            return [
                { id: 'monkey_king', price: '10 YAN', priceValue: '10', priceCurrencyCode: 'YAN', getPriceCurrencyImage: () => '' },
                { id: 'cacajao', price: '3 YAN', priceValue: '3', priceCurrencyCode: 'YAN', getPriceCurrencyImage: () => '' }
            ];
        }
        try {
            const catalog = await this.payments.getCatalog();
            return catalog || [];
        } catch (e) {
            console.error('Не удалось получить каталог', e);
            return [];
        }
    }

    async getCloudData(): Promise<any> {
        if (!this.player) return null;
        try {
            return await Promise.race([
                this.player.getData(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('getCloudData timeout')), 2000))
            ]);
        } catch (e) {
            console.error('Не удалось получить данные из облака', e);
            return null;
        }
    }

    async setCloudData(data: any): Promise<void> {
        if (!this.player) return;
        try {
            await Promise.race([
                this.player.setData(data),
                new Promise((_, reject) => setTimeout(() => reject(new Error('setCloudData timeout')), 2000))
            ]);
        } catch (e) {
            console.error('Не удалось сохранить данные в облако', e);
        }
    }

    getLanguage(): string {
        if (this.ys && this.ys.environment && this.ys.environment.i18n) {
            return this.ys.environment.i18n.lang;
        }
        
        if (typeof window !== 'undefined' && (window as any).ysdk && (window as any).ysdk.environment && (window as any).ysdk.environment.i18n) {
            return (window as any).ysdk.environment.i18n.lang;
        }
        
        if (typeof navigator !== 'undefined') {
            return navigator.language.split('-')[0];
        }
        
        return 'ru';
    }
}

export const yandexSdkService = new YandexSdkService();
