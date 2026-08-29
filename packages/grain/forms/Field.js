import { onCleanup } from '../index.js';
import { jsx } from '../core/jsx-compiler-new/jsx-runtime.js';
import { useFormContext } from './context.js';
import { getIn } from './utils/paths.js';

function readProp(value) {
  return typeof value === 'function' ? value() : value;
}

/**
 * Bound input (or custom component) for a form field path.
 */
export function Field(props) {
  const form = useFormContext();
  const name = readProp(props.name);
  if (!name) {
    throw new Error('Field: name is required');
  }

  const type = readProp(props.type);
  const validate = readProp(props.validate);
  const As = readProp(props.as) || readProp(props.component) || 'input';

  form.registerField(name, { validate });
  onCleanup(() => form.unregisterField(name));

  const value = () => getIn(form.values(), name);
  const isCheckbox = type === 'checkbox';
  const isRadio = type === 'radio';

  const {
    name: _n,
    type: _t,
    validate: _v,
    as: _as,
    component: _c,
    children,
    value: radioValue,
    onInput: userOnInput,
    onChange: userOnChange,
    onBlur: userOnBlur,
    ...rest
  } = props;

  const onInput = (e) => {
    form.handleChange(e);
    if (typeof userOnInput === 'function') userOnInput(e);
    if (typeof userOnChange === 'function') userOnChange(e);
  };

  const onBlur = (e) => {
    form.handleBlur(e);
    if (typeof userOnBlur === 'function') userOnBlur(e);
  };

  if (typeof As !== 'string') {
    const field = {
      name,
      get value() {
        return isCheckbox || isRadio ? readProp(radioValue) : value();
      },
      get checked() {
        if (isCheckbox) return !!value();
        if (isRadio) return value() === readProp(radioValue);
        return undefined;
      },
      onInput,
      onChange: onInput,
      onBlur,
    };
    const meta = {
      get value() {
        return value();
      },
      get error() {
        return getIn(form.errors(), name);
      },
      get touched() {
        return !!getIn(form.touched(), name);
      },
    };
    return jsx(As, { field, meta, form, ...rest }, children);
  }

  if (isCheckbox) {
    return jsx(
      As,
      {
        ...rest,
        type: 'checkbox',
        name,
        checked: () => !!value(),
        onChange: onInput,
        onBlur,
      },
      children
    );
  }

  if (isRadio) {
    const rv = readProp(radioValue);
    return jsx(
      As,
      {
        ...rest,
        type: 'radio',
        name,
        value: rv,
        checked: () => value() === rv,
        onChange: onInput,
        onBlur,
      },
      children
    );
  }

  return jsx(
    As,
    {
      ...rest,
      type,
      name,
      value: () => {
        const v = value();
        return v == null ? '' : v;
      },
      onInput,
      onChange: onInput,
      onBlur,
    },
    children
  );
}
