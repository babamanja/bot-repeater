type Locale = 'ru' | 'en';

const MESSAGES = {
  ru: {
    start: 'Привет! Я бот для слов 2',
    select_primary_lang: 'Выберите язык для основного языка',
    select_learning_lang: 'Выберите язык для изучения',
    no_langs: 'В базе пока нет языков. Добавьте через /addLang <langName>',
    setlangs_format: 'Формат: /setLangs <primaryLangId> <langToLearnId>',
    setlangs_ids_integers: 'IDs языков должны быть целыми числами.',
    setlangs_success: 'Готово. Языки установлены: {{primary}} -> {{learning}}',
    setlangs_missing_langs:
      'Сначала добавьте языки в таблицу Language через /addLang <langName>. Не найдено id: {{missing}}.',
    add_format: 'Формат: /add слово - перевод',
    missing_langs: 'Сначала выбери языки: /setLangs <primaryLangId> <langToLearnId>',
    add_success: 'Добавлено: {{word}} ✅ (pairId: {{pairId}})',
    addlang_format: 'Формат: /addLang <langName>',
    addlang_success: 'Готово. Язык добавлен: {{langName}} (langId: {{langId}})',
    review_no_words: 'Нет слов для повторения 🎉',
    review_prompt: 'Слово: {{promptWord}}',
    btn_know: '✅ знаю',
    btn_dont: '❌ не знаю',
    callback_invalid_id: 'Некорректный id',
    callback_word_not_found: 'Слово не найдено',
    callback_translation: 'Перевод: {{answerWord}}',
    callback_review_reveal: '{{learningWord}}\n{{primaryWord}}',
    btn_add_words: '➕ Добавить',
    add_flow_prompt_primary: 'Введи новое слово на языке «{{langName}}»:',
    add_flow_prompt_learning: 'Введи новое слово на языке «{{langName}}»:',
    add_flow_done_mock: 'Готово! {{word1}} — {{word2}} добавлено!',
    add_flow_suggestions_intro:
      'В базе уже есть перевод(ы) для этого слова. Нажми на вариант или введи свой перевод ниже.',
    add_flow_done: 'Готово: {{primary}} — {{learning}} (связка #{{pairId}})',
    btn_repeat_words: '🔁 Повторить 5 слов',
    review_session_complete: 'Готово! Повторено слов: {{count}}.',
    btn_review_give_more: 'Ещё 5',
    btn_review_cancel: 'Отмена',
    review_cancelled: 'Ок.',
    btn_settings: '⚙️ Настройки',
    keyboard_hint: 'Ниже — постоянные кнопки.',
    settings_stub: 'Настройки (заглушка).',
    settings_menu_title: 'Настройки',
    btn_settings_change_primary: 'Изменить оригинальный язык',
    btn_settings_change_learning: 'Изменить изучаемый язык',
    btn_settings_back: 'Назад',
    settings_back_closed: 'Меню закрыто.',
  },
  en: {
    start: 'Hi! I am a vocabulary bot',
    select_primary_lang: 'Choose a primary language',
    select_learning_lang: 'Choose a learning language',
    no_langs: 'No languages in the database yet. Add via /addLang <langName>',
    setlangs_format: 'Format: /setLangs <primaryLangId> <langToLearnId>',
    setlangs_ids_integers: 'Language IDs must be integers.',
    setlangs_success: 'Done. Languages set: {{primary}} -> {{learning}}',
    setlangs_missing_langs:
      'First add languages to the Language table via /addLang <langName>. Missing id(s): {{missing}}.',
    add_format: 'Format: /add word - translation',
    missing_langs: 'First choose languages: /setLangs <primaryLangId> <langToLearnId>',
    add_success: 'Added: {{word}} ✅ (pairId: {{pairId}})',
    addlang_format: 'Format: /addLang <langName>',
    addlang_success: 'Done. Language added: {{langName}} (langId: {{langId}})',
    review_no_words: 'No words to review 🎉',
    review_prompt: 'Word: {{promptWord}}',
    btn_know: '✅ I know',
    btn_dont: '❌ I don\'t know',
    callback_invalid_id: 'Invalid id',
    callback_word_not_found: 'Word not found',
    callback_translation: 'Translation: {{answerWord}}',
    callback_review_reveal: '{{learningWord}}\n{{primaryWord}}',
    btn_add_words: '➕ Add',
    add_flow_prompt_primary: 'Enter the new word in {{langName}}:',
    add_flow_prompt_learning: 'Enter the new word in {{langName}}:',
    add_flow_done_mock: 'Done! {{word1}} - {{word2}} added!',
    add_flow_suggestions_intro:
      'There are already translation(s) in the database. Tap one or type your own below.',
    add_flow_done: 'Done: {{primary}} — {{learning}} (pair #{{pairId}})',
    btn_repeat_words: '🔁 Repeat 5 words',
    review_session_complete: 'Done! Words reviewed: {{count}}.',
    btn_review_give_more: 'Give 5 more',
    btn_review_cancel: 'Cancel',
    review_cancelled: 'OK.',
    btn_settings: '⚙️ Settings',
    keyboard_hint: 'Persistent buttons below.',
    settings_stub: 'Settings (stub).',
    settings_menu_title: 'Settings',
    btn_settings_change_primary: 'Change primary language',
    btn_settings_change_learning: 'Change learning language',
    btn_settings_back: 'Back',
    settings_back_closed: 'Menu closed.',
  },
} as const;

/** Exact labels on the Settings reply button (for hears matching). */
export const SETTINGS_BUTTON_LABELS = [
  MESSAGES.ru.btn_settings,
  MESSAGES.en.btn_settings,
] as const;

export const ADD_WORDS_BUTTON_LABELS = [
  MESSAGES.ru.btn_add_words,
  MESSAGES.en.btn_add_words,
] as const;

export const REPEAT_WORDS_BUTTON_LABELS = [
  MESSAGES.ru.btn_repeat_words,
  MESSAGES.en.btn_repeat_words,
] as const;

type MessageKey = keyof typeof MESSAGES.ru;

function getLocale(ctx: any): Locale {
  const languageCode: unknown = ctx?.from?.language_code ?? ctx?.language_code;
  if (typeof languageCode !== 'string') return 'ru';
  return languageCode.toLowerCase().startsWith('en') ? 'en' : 'ru';
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{{${key}}}` : String(value);
  });
}

export function botT(ctx: any, key: MessageKey, vars: Record<string, string | number> = {}): string {
  const locale = getLocale(ctx);
  const template = MESSAGES[locale][key] ?? MESSAGES.ru[key];
  return interpolate(template, vars);
}
