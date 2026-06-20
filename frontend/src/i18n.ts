import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import landingEn from "./locales/en/landing.json";
import legalEn from "./locales/en/legal.json";
import translationEn from "./locales/en/translation.json";

const STORAGE_KEY = "i18nextLng";

const SUPPORTED_LANGUAGES = ["en", "ru"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ru") return stored;
  return "en";
}

function syncDocumentLang(lng: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          ...translationEn,
          ...landingEn,
          ...legalEn,
        },
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: {
      escapeValue: false,
    },
  })
  .then(() => {
    syncDocumentLang(i18n.language);
  });

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lng);
  }
  syncDocumentLang(lng);
});

export default i18n;
