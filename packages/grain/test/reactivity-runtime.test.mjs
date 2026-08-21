import assert from 'node:assert/strict';
import {
  batch,
  createDeferred,
  createEffect,
  createSignal,
  onMount,
  render,
  startTransition,
  useTransition,
} from 'grainlet';
import { createStore, produce, reconcile } from 'grainlet/store';
import { installDevtoolsHook } from 'grainlet/devtools';
import { setupDom, nextTick } from './helpers/dom.mjs';

{
  const hook = installDevtoolsHook();
  const [value, setValue] = createSignal('dev');
  setValue('tools');
  assert.ok(
    hook.getSnapshot().some((record) =>
      record.lastEvent === 'signal:update' && record.value === 'tools'
    )
  );
}

{
  const [value, setValue] = createSignal(0);
  let runs = 0;
  createEffect(() => {
    value();
    runs += 1;
  });
  batch(() => {
    setValue(1);
    setValue(2);
    batch(() => setValue(3));
  });
  assert.equal(value(), 3);
  assert.equal(runs, 2);
}

{
  const cleanupDom = setupDom('<!doctype html><div id="app"></div>');
  let mounted = 0;
  let cleaned = 0;
  function App() {
    onMount(() => {
      mounted += 1;
      return () => { cleaned += 1; };
    });
    return 'ready';
  }
  const instance = render(App, document.getElementById('app'));
  assert.equal(mounted, 1);
  instance.update({});
  assert.equal(mounted, 1);
  instance.unmount();
  assert.equal(cleaned, 1);
  cleanupDom();
}

{
  const [store, setStore] = createStore({
    todos: [{ done: false, title: 'one' }],
    user: { age: 1, name: 'Ada' },
  });
  let nameRuns = 0;
  createEffect(() => {
    store.user.name;
    nameRuns += 1;
  });
  setStore('user', 'age', 2);
  assert.equal(nameRuns, 1, 'unrelated nested paths stay granular');
  setStore('user', 'name', 'Grace');
  assert.equal(nameRuns, 2);
  setStore('todos', 0, produce((todo) => { todo.done = true; }));
  assert.equal(store.todos[0].done, true);
  setStore('user', reconcile({ age: 3, name: 'Grace' }));
  assert.equal(store.user.age, 3);
}

{
  const [value, setValue] = createSignal('old');
  let observed = value();
  createEffect(() => { observed = value(); });
  const [pending] = useTransition();
  const done = startTransition(() => setValue('new'));
  assert.equal(observed, 'old');
  assert.equal(pending(), true);
  await done;
  assert.equal(observed, 'new');
  assert.equal(pending(), false);

  const deferred = createDeferred(value);
  setValue('latest');
  await nextTick();
  assert.equal(deferred(), 'latest');
}

console.log('reactivity runtime tests passed');
