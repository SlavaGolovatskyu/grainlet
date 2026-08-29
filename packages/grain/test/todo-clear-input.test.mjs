import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
  { pretendToBeVisual: true }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;

const { createSignal, render } = await import('../index.js');
const { jsx } = await import('../core/jsx-compiler-new/jsx-runtime.js');
const { template, mountTemplate, bindTemplateProp, bindTemplateEvent } = await import(
  '../core/jsx-compiler-new/jsx-runtime.js'
);

function TodoList() {
  const [todos, setTodos] = createSignal([]);
  const [inputValue, setInputValue] = createSignal('');

  const addTodo = () => {
    const text = inputValue().trim();
    if (!text) return;
    setTodos([...todos(), { id: 1, text, completed: false }]);
    setInputValue('');
  };

  const _tmpl = template(
    '<div><input type="text" id="todo-input"></input><button id="add">Add</button></div>'
  );

  return jsx('div', null, [
    mountTemplate(_tmpl, (el) => {
      bindTemplateProp(
        el.querySelector('#todo-input') || el.firstChild,
        'value',
        () => inputValue()
      );
      bindTemplateEvent(el.querySelector('#add') || el.lastChild, 'onclick', addTodo);
      bindTemplateEvent(
        el.querySelector('#todo-input') || el.firstChild,
        'oninput',
        (e) => setInputValue(e.target.value)
      );
    }),
    jsx('p', { 'data-count': true }, () => String(todos().length)),
  ]);
}

render(TodoList, document.getElementById('app'));

const input = document.getElementById('todo-input');
input.value = 'buy milk';
input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
await new Promise((r) => setTimeout(r, 10));

document.getElementById('add').dispatchEvent(
  new dom.window.MouseEvent('click', { bubbles: true })
);
await new Promise((r) => setTimeout(r, 30));

if (input.value !== '') {
  throw new Error(`expected cleared input, got "${input.value}"`);
}

console.log('todo-clear-input: PASS');
