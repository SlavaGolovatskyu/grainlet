import { onCleanup } from '../index.js';
import { useFormContext } from './context.js';
import { getIn } from './utils/paths.js';

function readProp(value) {
  return typeof value === 'function' ? value() : value;
}

/**
 * @param {string|{ name: string, type?: string, value?: any, validate?: Function }} nameOrProps
 * @returns {[field, meta, helpers]}
 */
export function useField(nameOrProps) {
  const form = useFormContext();
  const props =
    typeof nameOrProps === 'string' ? { name: nameOrProps } : nameOrProps || {};
  const name = readProp(props.name);
  if (!name) {
    throw new Error('useField: name is required');
  }

  form.registerField(name, { validate: readProp(props.validate) });
  onCleanup(() => form.unregisterField(name));

  const field = {
    get name() {
      return name;
    },
    get value() {
      const v = getIn(form.values(), name);
      if (props.type === 'checkbox') return !!v;
      return v ?? '';
    },
    get checked() {
      if (props.type === 'checkbox') return !!getIn(form.values(), name);
      if (props.type === 'radio') {
        return getIn(form.values(), name) === props.value;
      }
      return undefined;
    },
    onInput: form.handleChange,
    onChange: form.handleChange,
    onBlur: form.handleBlur,
  };

  const meta = {
    get value() {
      return getIn(form.values(), name);
    },
    get error() {
      return getIn(form.errors(), name);
    },
    get touched() {
      return !!getIn(form.touched(), name);
    },
    get initialValue() {
      return getIn(form.initialValues(), name);
    },
  };

  const helpers = form.getFieldHelpers(name);

  return [field, meta, helpers];
}
