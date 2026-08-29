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
} = await import('../forms/index.js');

function FriendsApp() {
  return jsx(FormProvider, {
    initialValues: {
      friends: [{ name: '' }],
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

const input = () => root.querySelector('input');
if (!input()) throw new Error('expected an input');

input().focus();
if (document.activeElement !== input()) {
  throw new Error('expected input focused before typing');
}

// Simulate typing several characters — focus must survive each setIn clone.
for (const ch of 'hello') {
  const el = input();
  el.value = (el.value || '') + ch;
  el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 0));
  if (document.activeElement !== input()) {
    throw new Error(
      `focus lost after typing "${ch}" (value=${input()?.value})`
    );
  }
}

if (input().value !== 'hello') {
  throw new Error(`expected value "hello", got "${input().value}"`);
}

console.log('forms-field-array-typing: PASS');
