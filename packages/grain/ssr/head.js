import { onCleanup } from '../signals/onCleanup/onCleanup.js';
import {
  currentComponent,
  currentEffect,
} from '../signals/reactive-context/reactive-context.js';
import { getSSRContext, isServer } from './context.js';
import { escapeHtml } from './serialize.js';

function read(value) {
  return typeof value === 'function' ? value() : value;
}

function entryKey(tag, props) {
  return String(
    props.key
      ?? (tag === 'title'
        ? 'title'
        : `${tag}:${read(props.name) || read(props.property) || read(props.rel) || ''}:${read(props.href) || ''}`)
  );
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function upsertClientEntry(entry, scope = 'component') {
  const { key, props, tag } = entry;
  let node = [...document.head.querySelectorAll('[data-grainlet-head]')]
    .find((candidate) =>
      candidate.getAttribute('data-grainlet-head') === key
    );
  if (!node && tag === 'title') node = document.head.querySelector('title');
  if (!node && tag === 'meta' && props.name) {
    node = [...document.head.querySelectorAll('meta[name]')]
      .find((candidate) => candidate.getAttribute('name') === read(props.name));
  }
  if (!node && tag === 'meta' && props.property) {
    node = [...document.head.querySelectorAll('meta[property]')]
      .find((candidate) =>
        candidate.getAttribute('property') === read(props.property)
      );
  }
  if (!node && tag === 'link' && props.rel) {
    node = [...document.head.querySelectorAll('link[rel]')]
      .find((candidate) =>
        candidate.getAttribute('rel') === read(props.rel)
        && (!props.href || candidate.getAttribute('href') === read(props.href))
      );
  }
  if (node && node.tagName.toLowerCase() !== tag) {
    node.remove();
    node = null;
  }
  if (!node) {
    node = document.createElement(tag);
    node.setAttribute('data-grainlet-head', key);
    document.head.appendChild(node);
  }
  node.setAttribute('data-grainlet-head-scope', scope);
  for (const attribute of [...node.attributes]) {
    if (!attribute.name.startsWith('data-grainlet-head')) {
      node.removeAttribute(attribute.name);
    }
  }
  for (const [name, value] of Object.entries(props)) {
    if (name === 'children' || name === 'key' || name === 'json') continue;
    const resolved = read(value);
    if (resolved == null || resolved === false) continue;
    node.setAttribute(name === 'className' ? 'class' : name, String(resolved));
  }
  if (tag === 'title') node.textContent = String(read(props.children) ?? '');
  if (tag === 'script' && props.json !== undefined) {
    node.textContent = safeJson(read(props.json));
  }
  return node;
}

export function registerHeadEntry(tag, props = {}) {
  const key = entryKey(tag, props);
  const entry = { key, props, tag };
  const context = getSSRContext();
  if (context) {
    context.head.set(key, entry);
    return key;
  }
  if (typeof document === 'undefined') return key;
  const node = upsertClientEntry(entry);
  if (currentComponent || currentEffect) {
    onCleanup(() => {
      if (!isServer() && node.isConnected) node.remove();
    });
  }
  return key;
}

export function Head(props) {
  return props.children ?? null;
}

export function Title(props) {
  registerHeadEntry('title', props);
  return null;
}

export function Meta(props) {
  registerHeadEntry('meta', props);
  return null;
}

export function HeadLink(props) {
  registerHeadEntry('link', props);
  return null;
}

export function JsonLd(props) {
  registerHeadEntry('script', {
    ...props,
    key: props.key ?? 'jsonld',
    type: 'application/ld+json',
    json: props.value ?? props.children,
    children: undefined,
  });
  return null;
}

export function Canonical(props) {
  return HeadLink({ ...props, key: props.key ?? 'canonical', rel: 'canonical' });
}

export function OpenGraph(props) {
  const entries = [];
  for (const [name, content] of Object.entries(props)) {
    if (name === 'children' || name === 'key' || content == null) continue;
    entries.push(Meta({
      content,
      key: `og:${name}`,
      property: `og:${name}`,
    }));
  }
  return entries;
}

export function normalizeHeadEntries(metadata) {
  const entries = new Map();
  for (const value of metadata || []) {
    if (!value || typeof value !== 'object') continue;
    let tag;
    let props;
    if (value.title != null) {
      tag = 'title';
      props = { children: value.title, key: value.key };
    } else {
      tag = value.tag || (value.rel ? 'link' : 'meta');
      const { tag: _tag, ...rest } = value;
      props = rest;
    }
    const key = entryKey(tag, props);
    entries.set(key, { key, props, tag });
  }
  return [...entries.values()];
}

export function applyRouteHeadEntries(metadata) {
  if (typeof document === 'undefined') return;
  const entries = normalizeHeadEntries(metadata);
  const active = new Set(entries.map((entry) => entry.key));
  for (const node of document.head.querySelectorAll(
    '[data-grainlet-head-scope="route"]'
  )) {
    if (!active.has(node.getAttribute('data-grainlet-head'))) node.remove();
  }
  for (const entry of entries) upsertClientEntry(entry, 'route');
}

export function renderHead(context = getSSRContext()) {
  if (!context?.head) return '';
  return [...context.head.values()].map(({ tag, props }) => {
    if (tag === 'title') {
      return `<title>${escapeHtml(read(props.children) ?? '')}</title>`;
    }
    if (tag === 'script' && props.json !== undefined) {
      const attributes = Object.entries(props)
        .filter(([name, value]) =>
          !['children', 'json', 'key'].includes(name) && read(value) != null
        )
        .map(([name, value]) =>
          `${name}="${escapeHtml(read(value))}"`
        )
        .join(' ');
      return `<script${attributes ? ` ${attributes}` : ''}>${safeJson(read(props.json))}</script>`;
    }
    const attributes = Object.entries(props)
      .filter(([name, value]) =>
        name !== 'children' && name !== 'key' && read(value) != null
      )
      .map(([name, value]) =>
        `${name === 'className' ? 'class' : name}="${escapeHtml(read(value))}"`
      )
      .join(' ');
    return `<${tag}${attributes ? ` ${attributes}` : ''}>`;
  }).join('\n');
}
