import { yandexSdkService } from './YandexSdkService';

type Translations = {
    [key: string]: {
        ru: string;
        en: string;
    };
};

const translations: Translations = {
    'start': { ru: 'Начать', en: 'Start' },
    'select_fighter': { ru: 'Выберите бойца', en: 'Select Fighter' },
    'next': { ru: 'Далее', en: 'Next' },
    'select_arena': { ru: 'Выберите арену', en: 'Select Arena' },
    'start_fight': { ru: 'Начать бой', en: 'Start Fight' },
    'select_difficulty': { ru: 'Выберите сложность', en: 'Select Difficulty' },
    'diff_easy': { ru: 'Мартышка', en: 'Monkey' },
    'diff_medium': { ru: 'Шимпанзе', en: 'Chimpanzee' },
    'diff_hard': { ru: 'Король обезьян', en: 'Monkey King' },
    'streak': { ru: 'Серия: ', en: 'Streak: ' },
    'controls': { ru: 'Управление: W,A,D - Движение | Enter - Удар рукой | Shift - Удар ногой | Space - Бросок банана | Space+Enter - Динамит', en: 'Controls: W,A,D - Move | Enter - Punch | Shift - Kick | Space - Throw Banana | Space+Enter - Dynamite' },
    'hint_title': { ru: 'Управление', en: 'Controls' },
    'hint_text': { ru: 'W,A,D - Движение\nEnter - Удар рукой\nShift - Удар ногой\nSpace - Бросок банана\nSpace+Enter - Динамит', en: 'W,A,D - Move\nEnter - Punch\nShift - Kick\nSpace - Throw Banana\nSpace+Enter - Dynamite' },
    'king_defeated': { ru: 'Король повержен, абсолютная победа!', en: 'King defeated, absolute victory!' },
    'continue_streak': { ru: 'Продолжить серию!', en: 'Continue streak!' },
    'restart': { ru: 'Начать заново', en: 'Restart' },
    'victory': { ru: 'Победа', en: 'Victory' },
    'continue': { ru: 'Продолжить', en: 'Continue' },
    'defeat': { ru: 'Вы проиграли', en: 'You lost' },
    'best_streak': { ru: 'Лучший счёт: ', en: 'Best streak: ' },
    'strength': { ru: 'Сила: ', en: 'Strength: ' },
    'speed': { ru: 'Скорость: ', en: 'Speed: ' },
    'ranged': { ru: 'Дальние атаки: ', en: 'Ranged: ' },
    'buy': { ru: 'Купить', en: 'Buy' },
    'purchased': { ru: 'Куплено', en: 'Purchased' },
    
    // Fighters
    'capuchin': { ru: 'Капуцин', en: 'Capuchin' },
    'chimpanzee': { ru: 'Шимпанзе', en: 'Chimpanzee' },
    'gorilla': { ru: 'Горилла', en: 'Gorilla' },
    'mandrill': { ru: 'Мандрил', en: 'Mandrill' },
    'monkey_king': { ru: 'Король обезьян', en: 'Monkey King' },
    'nose': { ru: 'Носач', en: 'Proboscis' },
    'orange': { ru: 'Оранж', en: 'Orange' },
    'orangutan': { ru: 'Орангутан', en: 'Orangutan' },
    'spider_monkey': { ru: 'Паукообразная', en: 'Spider Monkey' },
    'cacajao': { ru: 'Какажао', en: 'Cacajao' },
    'tamarin': { ru: 'Тамарин', en: 'Tamarin' },
    'tibetan_macaque': { ru: 'Тибетская макака', en: 'Tibetan Macaque' },

    // Arenas
    'jungle_forest_background': { ru: 'Джунгли', en: 'Jungle Forest' },
    'mountain_background': { ru: 'Горы', en: 'Mountain' },
    'river_background': { ru: 'Река', en: 'River' },
    'temple_background': { ru: 'Храм', en: 'Temple' },
    'volcano': { ru: 'Вулкан', en: 'Volcano' },
    'beach': { ru: 'Пляж', en: 'Beach' },
    'paused': { ru: 'ПАУЗА', en: 'PAUSED' },
    'resume': { ru: 'ПРОДОЛЖИТЬ', en: 'RESUME' },
    'game_title': { ru: 'Monkey Kombat', en: 'Monkey Kombat' }
};

export class LocalizationService {
    private currentLang: 'ru' | 'en' = 'en';

    init() {
        const lang = yandexSdkService.getLanguage();
        if (lang === 'ru' || lang === 'be' || lang === 'kk' || lang === 'uk' || lang === 'uz') {
            this.currentLang = 'ru';
        } else {
            this.currentLang = 'en';
        }
    }

    getText(key: string): string {
        if (translations[key]) {
            return translations[key][this.currentLang];
        }
        return key;
    }
}

export const localizationService = new LocalizationService();
