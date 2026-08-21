import { jsx } from '../core/jsx-compiler-new/jsx-runtime.js';
import { createSignal } from '../signals/createSignal/createSignal.js';
import { onMount } from '../signals/onMount/onMount.js';
import {
  getDevtoolsHook,
  installDevtoolsHook,
} from './hook.js';

function inspect(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const panelStyle = [
  'position:fixed',
  'right:0',
  'bottom:0',
  'z-index:2147483647',
  'max-width:32rem',
  'max-height:45vh',
  'overflow:auto',
  'padding:.75rem',
  'font:12px/1.4 ui-monospace,monospace',
  'color:#eee',
  'background:#171717',
  'border:1px solid #555',
].join(';');

export function QueryDevtools(props) {
  const client = typeof props.client === 'function'
    ? props.client()
    : props.client;
  const [revision, setRevision] = createSignal(0);
  onMount(() => {
    if (!client) return;
    const refresh = () => setRevision((value) => value + 1);
    const query = client.getQueryCache().subscribe(refresh);
    const mutation = client.getMutationCache().subscribe(refresh);
    return () => {
      query();
      mutation();
    };
  });
  const rows = () => {
    revision();
    return client?.getQueryCache().getAll().map((query) =>
      jsx(
        'li',
        { 'data-query-hash': query.queryHash },
        `${query.state.status} ${query.queryHash} ${inspect(query.state.data)}`
      )
    ) ?? [];
  };
  return jsx(
    'section',
    {},
    jsx('strong', {}, 'Queries'),
    jsx('ul', {}, rows)
  );
}

export function GrainletDevtools(props = {}) {
  const hook = installDevtoolsHook();
  const [revision, setRevision] = createSignal(0);
  onMount(() => hook.subscribe(() => setRevision((value) => value + 1)));
  const records = () => {
    revision();
    return (getDevtoolsHook()?.getSnapshot() || []).map((record) =>
      jsx(
        'li',
        { 'data-devtools-id': record.id },
        `${record.id} ${record.lastEvent} ${record.name || ''} ${record.value === undefined ? '' : inspect(record.value)}`
      )
    );
  };
  return jsx(
    'aside',
    {
      'aria-label': 'Grainlet Devtools',
      style: panelStyle,
    },
    jsx('strong', {}, 'Grainlet'),
    jsx('ul', {}, records),
    props.queryClient
      ? jsx(QueryDevtools, { client: props.queryClient })
      : null
  );
}

export {
  getDevtoolsHook,
  installDevtoolsHook,
} from './hook.js';
