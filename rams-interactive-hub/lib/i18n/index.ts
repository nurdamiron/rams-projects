export { LanguageProvider, useLanguage } from "./context";
export { translations, languageNames, languageFlags } from "./translations";
export type { Language, TranslationKey } from "./translations";
export {
  projectTranslations,
  getLocalizedProject,
  getLocalizedStatus,
  getLocalizedSceneType,
  getLocalizedSceneTitle,
  getLocalizedClass,
  statusTranslations,
  sceneTypeTranslations,
  classTranslations,
} from "./project-translations";
export type { LocalizedText, ProjectTranslation } from "./project-translations";
