import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
  { pretendToBeVisual: true }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { render } = await import('../index.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const {
  FormProvider,
  Form,
  Field,
  ErrorMessage,
  required,
} = await import('../forms/index.js');

/** Babel wrap-jsx-accessors turns validate={[required(...)]} into () => [...]. */
function FieldValidateDemo() {
  return jsx(FormProvider, {
    initialValues: { name: '' },
    children: (form) =>
      jsx(Form, null, [
        jsx(Field, {
          name: 'name',
          type: 'text',
          validate: () => [required('Name is required')],
        }),
        jsx(ErrorMessage, {
          name: 'name',
          children: (msg) => jsx('p', { class: 'error' }, msg),
        }),
        jsx(
          'button',
          { type: 'submit' },
          'Submit'
        ),
      ]),
  });
}

const root = document.getElementById('app');
render(FieldValidateDemo, root);

root.querySelector('button[type="submit"]').dispatchEvent(
  new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })
);

await new Promise((r) => setTimeout(r, 20));

const errorEl = root.querySelector('.error');
if (!errorEl) {
  throw new Error('expected validation error after submit');
}
if (errorEl.textContent !== 'Name is required') {
  throw new Error(
    `expected "Name is required", got ${JSON.stringify(errorEl.textContent)}`
  );
}

console.log('forms-field-validate-accessor: PASS');
