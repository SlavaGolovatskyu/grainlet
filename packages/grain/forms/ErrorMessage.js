import { Show } from '../index.js';
import { jsx } from '../core/jsx-compiler-new/jsx-runtime.js';
import { useFormContext } from './context.js';
import { getIn } from './utils/paths.js';
import { formatError } from './validators.js';

function readProp(value) {
  return typeof value === 'function' ? value() : value;
}

/**
 * Render field error when the field is touched and has an error.
 */
export function ErrorMessage(props) {
  const form = useFormContext();
  const name = readProp(props.name);
  if (!name) {
    throw new Error('ErrorMessage: name is required');
  }

  const message = () => {
    const touched = getIn(form.touched(), name);
    const error = getIn(form.errors(), name);
    if (!touched || error == null || error === '') return undefined;
    return formatError(error);
  };

  const As = readProp(props.component) || readProp(props.as);
  const children = props.children;

  return jsx(Show, {
    when: message,
    children: (msg) => {
      if (typeof children === 'function') {
        return children(msg);
      }
      if (As) {
        if (typeof As === 'string') {
          return jsx(As, null, msg);
        }
        return jsx(As, null, msg);
      }
      return jsx('span', null, msg);
    },
  });
}
