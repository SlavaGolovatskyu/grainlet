import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
  { pretendToBeVisual: true }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { For, render } = await import('../index.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const {
  FormProvider,
  Form,
  Field,
  FieldArray,
  required,
} = await import('../forms/index.js');

/** Plain objects — no id; For auto-keys via WeakMap UUID. */
function FriendsApp() {
  return jsx(FormProvider, {
    initialValues: {
      friends: [{ name: 'a' }, { name: 'b' }],
    },
    children: () =>
      jsx(Form, null, [
        jsx(FieldArray, {
          name: 'friends',
          children: (helpers) =>
            jsx(
              'div',
              { class: 'list' },
              jsx(For, {
                each: () => helpers.form.values().friends,
                children: (_friend, index) => {
                  const i = typeof index === 'function' ? index : () => index;
                  const namePath = () => `friends[${i()}].name`;
                  return jsx('div', { class: 'row' }, [
                    jsx(Field, {
                      name: namePath,
                      type: 'text',
                      validate: [required('required')],
                    }),
                    jsx(
                      'button',
                      {
                        type: 'button',
                        class: 'remove',
                        onClick: () => helpers.remove(i()),
                      },
                      'Remove'
                    ),
                  ]);
                },
              })
            ),
        }),
      ]),
  });
}

const root = document.getElementById('app');
render(FriendsApp, root);

const inputs = () => [...root.querySelectorAll('input')];
const removes = () => [...root.querySelectorAll('button.remove')];

if (inputs().length !== 2) {
  throw new Error(`expected 2 inputs, got ${inputs().length}`);
}

removes()[0].dispatchEvent(
  new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })
);

await new Promise((r) => setTimeout(r, 20));

if (inputs().length !== 1) {
  throw new Error(`expected 1 input after remove, got ${inputs().length}`);
}
if (root.querySelectorAll('.row').length !== 1) {
  throw new Error('expected 1 row after remove');
}

console.log('forms-field-array-remove: PASS');
