import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
  { pretendToBeVisual: true }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { For, Show, render } = await import('../index.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const {
  FormProvider,
  Form,
  Field,
  FieldArray,
  ErrorMessage,
  required,
  minLength,
} = await import('../forms/index.js');

function FriendsDemo() {
  return jsx(FormProvider, {
    initialValues: { title: '', friends: [{ name: '' }] },
    rules: {
      title: [required('Title is required'), minLength(2)],
    },
    onSubmit: async (values, { setStatus }) => {
      setStatus({ ok: true, count: values.friends.length });
    },
    children: (form) =>
      jsx(Form, null, [
        jsx(Field, { name: 'title', type: 'text' }),
        jsx(ErrorMessage, {
          name: 'title',
          children: (msg) => jsx('p', { class: 'error' }, msg),
        }),
        jsx(FieldArray, {
          name: 'friends',
          children: (helpers) =>
            jsx(
              'div',
              null,
              jsx(For, {
                each: () => helpers.form.values().friends,
                children: (_friend, index) => {
                  const i = typeof index === 'function' ? index : () => index;
                  const namePath = () => `friends[${i()}].name`;
                  return jsx('div', { class: 'friend' }, [
                    jsx(Field, {
                      name: namePath,
                      type: 'text',
                      validate: () => [required('Name is required')],
                    }),
                    jsx(ErrorMessage, {
                      name: namePath,
                      children: (msg) => jsx('p', { class: 'error' }, msg),
                    }),
                    jsx(
                      'button',
                      {
                        type: 'button',
                        onClick: () => helpers.remove(i()),
                      },
                      'Remove'
                    ),
                  ]);
                },
              }),
              jsx(
                'button',
                {
                  type: 'button',
                  onClick: () => helpers.push({ name: '' }),
                },
                'Add friend'
              ),
              jsx(
                'button',
                { type: 'submit', disabled: form.isSubmitting() },
                'Save list'
              )
            ),
        }),
        jsx(Show, {
          when: () => form.status()?.ok,
          children: () => jsx('div', { class: 'success' }, 'Saved'),
        }),
      ]),
  });
}

try {
  render(FriendsDemo, document.getElementById('app'));
  console.log('example-22-mount: PASS');
} catch (e) {
  console.error('example-22-mount: FAIL', e);
  process.exit(1);
}
