import { createSignal, render, For } from 'grainlet';

let nextRowId = 4;

/**
 * Proves keyed For only re-runs the changed row.
 * Each Item closes over its own render counter — bump one row and only that
 * badge should climb. Reorder / insert should leave untouched rows alone.
 */

function createItem(id, label) {
  let renders = 0;
  function Item(props) {
    renders += 1;
    const row = props.row;
    return (
      <li class={`row flash-${renders % 2}`}>
        <div class="row-main">
          <strong>{row.label}</strong>
          <span class="value">value: {row.value}</span>
        </div>
        <div class="row-meta">
          <span class="badge">renders: {renders}</span>
          <button type="button" onclick={() => props.onBump(row.id)}>
            Bump
          </button>
          <button type="button" class="ghost" onclick={() => props.onRemove(row.id)}>
            Remove
          </button>
        </div>
      </li>
    );
  }
  return { id, label, value: 0, Item };
}

function ForKeyedDemo() {
  const [rows, setRows] = createSignal([
    createItem(1, 'Alpha'),
    createItem(2, 'Bravo'),
    createItem(3, 'Charlie'),
  ]);

  const bump = (id) => {
    setRows((list) =>
      list.map((row) => (row.id === id ? { ...row, value: row.value + 1 } : row))
    );
  };

  const remove = (id) => {
    setRows((list) => list.filter((row) => row.id !== id));
  };

  const add = () => {
    const id = nextRowId++;
    setRows((list) => [...list, createItem(id, `Item ${id}`)]);
  };

  const shuffle = () => {
    setRows((list) => {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  };

  const bumpAll = () => {
    setRows((list) => list.map((row) => ({ ...row, value: row.value + 1 })));
  };

  return (
    <div class="demo">
      <h1>For — keyed re-renders</h1>
      <p class="lead">
        Press <strong>Bump</strong> on one row. Only that row’s <code>renders</code> badge
        should increase. Sibling rows keep their count (and stay mounted).
      </p>

      <div class="toolbar">
        <button type="button" onclick={add}>
          Add row
        </button>
        <button type="button" onclick={shuffle}>
          Shuffle order
        </button>
        <button type="button" class="warn" onclick={bumpAll}>
          Bump all (expect every badge +1)
        </button>
      </div>

      <ul class="list">
        <For each={rows()} fallback={<li class="muted">No rows</li>}>
          {(row) => {
            const Item = row.Item;
            return <Item row={row} onBump={bump} onRemove={remove} />;
          }}
        </For>
      </ul>

      <p class="hint">
        Tip: after shuffling, bump one row again — still only that badge should move.
        <code>Bump all</code> replaces every object, so every row re-renders (expected).
      </p>
    </div>
  );
}

render(ForKeyedDemo, document.getElementById('app'));
