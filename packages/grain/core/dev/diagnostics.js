let hydrationOptions = {
  onMismatch: null,
  strict: false,
};

export function configureHydration(options = {}) {
  hydrationOptions = {
    ...hydrationOptions,
    ...options,
  };
  return () => {
    hydrationOptions = { onMismatch: null, strict: false };
  };
}

export function componentStack(owner, source) {
  const lines = [];
  let current = owner;
  while (current) {
    const name = current._displayName || current._componentFn?.name || 'Anonymous';
    lines.push(`    at <${name}>`);
    current = current._parentOwner;
  }
  if (source?.fileName) {
    lines.unshift(
      `    at ${source.fileName}:${source.lineNumber || 0}:${source.columnNumber || 0}`
    );
  }
  return lines.join('\n');
}

function describeNode(node) {
  if (!node) return 'missing node';
  if (node.nodeType === 3) return `text ${JSON.stringify(node.nodeValue)}`;
  if (node.nodeType === 1) return `<${node.tagName.toLowerCase()}>`;
  return `nodeType ${node.nodeType}`;
}

function describeVnode(vdom) {
  if (vdom == null || typeof vdom === 'boolean') return 'empty content';
  if (typeof vdom === 'string' || typeof vdom === 'number') {
    return `text ${JSON.stringify(String(vdom))}`;
  }
  if (Array.isArray(vdom)) return 'fragment';
  if (typeof vdom === 'function') return 'dynamic accessor';
  const type = vdom?.type;
  return typeof type === 'string'
    ? `<${type}>`
    : `<${type?.displayName || type?.name || 'Component'}>`;
}

export function reportHydrationMismatch({
  existingNode,
  owner,
  path,
  reason,
  vdom,
}) {
  const source = vdom?.__source;
  const detail = {
    actual: describeNode(existingNode),
    componentStack: componentStack(owner, source),
    expected: describeVnode(vdom),
    existingNode,
    path,
    reason,
    source,
    vdom,
  };
  const message = [
    `[hydrate] mismatch at ${path}: ${reason}`,
    `Expected ${detail.expected}, received ${detail.actual}.`,
    detail.componentStack,
  ].filter(Boolean).join('\n');
  hydrationOptions.onMismatch?.(detail);
  if (hydrationOptions.strict) {
    const error = new Error(message);
    error.hydrationMismatch = detail;
    throw error;
  }
  console.warn(message, detail);
  return detail;
}
