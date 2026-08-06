import { onCleanup } from '../signals/index.js';
import { jsx } from '../core/jsx-compiler-new/jsx-runtime.js';
import { createI18n } from './createI18n.js';
import { I18nContext } from './context.js';

export function I18nProvider(props) {
  const i18n = props.client ?? createI18n(props.config ?? {});
  onCleanup(() => i18n.dispose());

  const children = props.children;
  const content =
    typeof children === 'function' ? children(i18n) : children;

  return jsx(I18nContext.Provider, { value: i18n }, content);
}
