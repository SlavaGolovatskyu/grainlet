import type { JSX } from '../jsx-runtime.js';
import type { Accessor } from './signals.js';

export type TranslationVariables = Record<string, unknown>;

export interface TranslationDictionary {
  [key: string]: string | number | TranslationDictionary;
}

export type TranslationModule =
  | TranslationDictionary
  | { default: TranslationDictionary };

export type NamespaceResource =
  | TranslationDictionary
  | (() => TranslationModule | Promise<TranslationModule>);

export type I18nResources = Record<
  string,
  Record<string, NamespaceResource>
>;

export interface I18nConfig {
  locale?: string;
  fallbackLocale?: string;
  resources?: I18nResources;
}

export interface I18nClient {
  locale: Accessor<string>;
  setLocale(locale: string): string;
  changeLanguage(locale: string): string;
  t(
    namespace: string,
    key: string,
    variables?: TranslationVariables
  ): string;
  getResource(
    locale: string,
    namespace: string
  ): TranslationDictionary | undefined;
  loadNamespace(
    locale: string,
    namespace: string
  ): Promise<TranslationDictionary | undefined>;
  dispose(): void;
}

export interface UseTranslationResult {
  t(key: string, variables?: TranslationVariables): string;
  locale: Accessor<string>;
  setLocale(locale: string): string;
  changeLanguage(locale: string): string;
  i18n: I18nClient;
}

export interface I18nProviderProps {
  client?: I18nClient;
  config?: I18nConfig;
  children?: JSX.Element | ((i18n: I18nClient) => JSX.Element);
}

export declare function createI18n(config?: I18nConfig): I18nClient;
export declare function I18nProvider(props: I18nProviderProps): any;
export declare function useI18n(): I18nClient;
export declare function useTranslation(
  namespace: string
): UseTranslationResult;
export declare const I18nContext: any;

export declare function getTranslation(
  dictionary: TranslationDictionary | undefined,
  key: string
): string | undefined;
export declare function interpolate(
  message: string,
  variables?: TranslationVariables
): string;
export declare function translate(
  dictionary: TranslationDictionary | undefined,
  key: string,
  variables?: TranslationVariables
): string | undefined;
