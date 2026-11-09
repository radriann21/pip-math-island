/**
 * Public surface of the presentation foundation, consumed by the pages/containers (T8) and by `src/app`.
 * Styles are not re-exported here: import `src/presentation/styles/index.css` once from the entry point.
 */
export * from './atoms';
export * from './molecules';
export * from './organisms';
export { I18nProvider, interpolate, messagesEn, messagesEs, useI18n } from './i18n';
export type { I18nValue, MessageKey, MessageParams, Messages } from './i18n';
export { hasModifier, isTypingTarget, useDocumentKeydown } from './hooks/useDocumentKeydown';
