import { en, Messages } from '@/i18n/en';
import { SupportedLocale } from '@/i18n/locales';

type Primitive = string | number | boolean | null;
type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends Primitive ? T[K] : PartialDeep<T[K]>;
};

const pl: PartialDeep<Messages> = {
  common: { cancel: 'Anuluj', save: 'Zapisz', saving: 'Zapisywanie', select: '<Wybierz>' },
  settings: { language: 'Język' },
  profile: { changeAvatar: 'Zmień awatar', nickname: 'Pseudonim:', nicknamePlaceholder: 'Wpisz pseudonim' },
  user: { defaultName: 'Gracz {{postfix}}' },
};

const de: PartialDeep<Messages> = {
  common: { cancel: 'Abbrechen', save: 'Speichern', saving: 'Speichern', select: '<Auswählen>' },
  settings: { language: 'Sprache' },
  profile: { changeAvatar: 'Avatar ändern', nickname: 'Spitzname:', nicknamePlaceholder: 'Spitznamen eingeben' },
  user: { defaultName: 'Spieler {{postfix}}' },
};

const fr: PartialDeep<Messages> = {
  common: { cancel: 'Annuler', save: 'Enregistrer', saving: 'Enregistrement', select: '<Sélectionner>' },
  settings: { language: 'Langue' },
  profile: { changeAvatar: 'Changer avatar', nickname: 'Pseudo :', nicknamePlaceholder: 'Saisir un pseudo' },
  user: { defaultName: 'Joueur {{postfix}}' },
};

const lt: PartialDeep<Messages> = {
  common: { cancel: 'Atšaukti', save: 'Išsaugoti', saving: 'Saugoma', select: '<Pasirinkti>' },
  settings: { language: 'Kalba' },
  profile: { changeAvatar: 'Keisti avatarą', nickname: 'Slapyvardis:', nicknamePlaceholder: 'Įveskite slapyvardį' },
  rooms: {
    battle: 'Mūšis',
    log: 'Žurnalas',
    copy: 'Kopijuoti',
    copied: 'Nukopijuota ✓',
    changeProfile: 'Keisti',
  },
  battle: {
    playersWin: 'Žaidėjai laimi',
    monstersWin: 'Monstrai laimi',
    monsterWins: 'Monstras laimi',
    playerSide: 'Žaidėjų pusė',
    monsterSide: 'Monstrų pusė',
  },
  history: {
    created: 'sukurtas',
    removed: 'pašalintas',
    started: 'pradėtas',
    concluded: 'Užbaigtas',
    discarded: 'atmestas',
    battleAccessibility: '{{prefix}}{{name}}, {{status}}, {{relativeTime}}.{{suffix}}',
    openBattleRecordHint: ' Dukart bakstelėkite, kad atidarytumėte mūšio įrašą.',
  },
  user: { defaultName: 'Žaidėjas {{postfix}}' },
};

const lv: PartialDeep<Messages> = {
  common: { cancel: 'Atcelt', save: 'Saglabāt', saving: 'Saglabā', select: '<Izvēlēties>' },
  settings: { language: 'Valoda' },
  profile: { changeAvatar: 'Mainīt avataru', nickname: 'Segvārds:', nicknamePlaceholder: 'Ievadi segvārdu' },
  user: { defaultName: 'Spēlētājs {{postfix}}' },
};

const et: PartialDeep<Messages> = {
  common: { cancel: 'Tühista', save: 'Salvesta', saving: 'Salvestamine', select: '<Vali>' },
  settings: { language: 'Keel' },
  profile: { changeAvatar: 'Muuda avatari', nickname: 'Hüüdnimi:', nicknamePlaceholder: 'Sisesta hüüdnimi' },
  user: { defaultName: 'Mängija {{postfix}}' },
};

const ru: PartialDeep<Messages> = {
  common: { cancel: 'Отмена', save: 'Сохранить', saving: 'Сохранение', select: '<Выбрать>' },
  settings: { language: 'Язык' },
  profile: { changeAvatar: 'Сменить аватар', nickname: 'Никнейм:', nicknamePlaceholder: 'Введите никнейм' },
  user: { defaultName: 'Игрок {{postfix}}' },
};

const be: PartialDeep<Messages> = {
  common: { cancel: 'Скасаваць', save: 'Захаваць', saving: 'Захаванне', select: '<Выбраць>' },
  settings: { language: 'Мова' },
  profile: { changeAvatar: 'Змяніць аватар', nickname: 'Нікнэйм:', nicknamePlaceholder: 'Увядзіце нікнэйм' },
  user: { defaultName: 'Гулец {{postfix}}' },
};

const uk: PartialDeep<Messages> = {
  common: { cancel: 'Скасувати', save: 'Зберегти', saving: 'Збереження', select: '<Вибрати>' },
  settings: { language: 'Мова' },
  profile: { changeAvatar: 'Змінити аватар', nickname: 'Нікнейм:', nicknamePlaceholder: 'Введіть нікнейм' },
  user: { defaultName: 'Гравець {{postfix}}' },
};

export const translations: Record<SupportedLocale, PartialDeep<Messages>> = {
  en,
  pl,
  de,
  fr,
  lt,
  lv,
  et,
  ru,
  be,
  uk,
};
