/* ------------------------------------------------------------------ *
 * i18n.js — translation table and language detection.
 *
 * Supports German and English. The language is taken automatically from
 * hass.language (Home Assistant's own language setting); there is
 * deliberately no card-specific language option. Before the first hass
 * object exists (e.g. when registering the card in index.js),
 * detectLanguageFallback() falls back to localStorage/navigator.
 *
 * The actual strings live in locales/en.json and locales/de.json, not
 * here — adding a language means adding a locales/<lang>.json, not
 * touching this file. build.mjs inlines those JSON files into the
 * bundle at build time (see the JSON-import handling there), since the
 * dist output has zero runtime dependencies and can't fetch them.
 * ------------------------------------------------------------------ */

import localeEn from './locales/en.json' with { type: 'json' };
import localeDe from './locales/de.json' with { type: 'json' };

const TRANSLATIONS = {
  en: localeEn.translations,
  de: localeDe.translations,
};

const ROOM_NAME_SUGGESTIONS = {
  en: localeEn.roomNameSuggestions,
  de: localeDe.roomNameSuggestions,
};

/** Translates `key` into `lang`, falling back to English and then to the key itself. */
export function t(lang, key, vars) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let str = dict[key] != null ? dict[key] : TRANSLATIONS.en[key];
  if (str == null) return key;
  if (vars) {
    for (const name of Object.keys(vars)) {
      str = str.replace(new RegExp(`\\{${name}\\}`, 'g'), vars[name]);
    }
  }
  return str;
}

export function roomNameSuggestions(lang) {
  return ROOM_NAME_SUGGESTIONS[lang] || ROOM_NAME_SUGGESTIONS.en;
}

/**
 * Guess the language without a hass object — for places that run before
 * the first hass update (registration in index.js, static stub config).
 */
export function detectLanguageFallback() {
  let stored = '';
  try {
    stored = (typeof localStorage !== 'undefined' && localStorage.getItem('selectedLanguage')) || '';
  } catch (e) {
    stored = '';
  }
  const raw = stored.replace(/^"|"$/g, '') || (typeof navigator !== 'undefined' && navigator.language) || 'en';
  return normalizeLanguage(raw);
}

/** Reads hass.language, otherwise falls back via detectLanguageFallback(). */
export function detectLanguage(hass) {
  return normalizeLanguage((hass && hass.language) || detectLanguageFallback());
}

/** Only German and English are supported; anything else falls back to English. */
function normalizeLanguage(raw) {
  return String(raw || '').toLowerCase().startsWith('de') ? 'de' : 'en';
}
