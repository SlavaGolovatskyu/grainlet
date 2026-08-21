import assert from 'node:assert/strict';
import { grainJsx } from '../index.js';

const plugin = grainJsx();
const transform = (code, id = '/src/App.jsx') =>
  plugin.transform.call({ warn: (message) => { throw new Error(message); } }, code, id);

{
  const result = await transform(
    'export function App(){ return <p title={name()}>{count()}</p> }'
  );
  assert.match(result.code, /mountTemplate/);
  assert.match(result.code, /bindTemplateText/);
  assert.match(result.code, /\(\) => name\(\)/);
  assert.ok(result.map, 'transform returns a source map');
}

{
  const result = await transform(
    'export function App(){ return <Button onclick={handler}>{props.children}</Button> }'
  );
  assert.match(result.code, /<Button/);
  assert.doesNotMatch(result.code, /onclick=\{\(\) => handler/);
}

{
  const result = await transform(
    'export function App(){ return <>{items().map(item => <li key={item}>{item}</li>)}</> }'
  );
  assert.match(result.code, /Fragment|<>/);
}

{
  const result = await transform(
    'export function App(){ return <section>{count()}</section> }',
    '/src/App.jsx'
  );
  assert.ok(result.map.mappings || result.map.sources, 'source map is populated');
}

assert.equal(await transform('export const value = 1', '/src/value.js'), null);

console.log('grainlet-vite transform tests passed');
