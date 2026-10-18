/**
 * Grainlet's template compiler calls bare JSX identifiers (`() => NAME()`),
 * which is correct for signal getters and throws for string/number constants.
 * Host elements only: turn those identifiers into `() => NAME` before
 * grainlet-vite runs. Component props and event handlers stay untouched.
 */
export default function jsxConstAccessors({ types: t }) {
  function isHostName(name) {
    return t.isJSXIdentifier(name) && /^[a-z]/.test(name.name);
  }

  function isEventOrRef(name) {
    return (
      name === 'ref' ||
      name === 'onclick' ||
      name === 'onClick' ||
      /^on[A-Z]/.test(name)
    );
  }

  function wrapIdentifier(expression) {
    if (!t.isIdentifier(expression)) return expression;
    return t.arrowFunctionExpression([], expression);
  }

  return {
    name: 'jsx-const-accessors',
    visitor: {
      JSXElement(path) {
        const opening = path.node.openingElement;
        if (!isHostName(opening.name)) return;

        for (const attr of opening.attributes) {
          if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue;
          if (isEventOrRef(attr.name.name)) continue;
          if (!t.isJSXExpressionContainer(attr.value)) continue;
          attr.value.expression = wrapIdentifier(attr.value.expression);
        }

        for (const child of path.node.children) {
          if (!t.isJSXExpressionContainer(child)) continue;
          child.expression = wrapIdentifier(child.expression);
        }
      },
    },
  };
}
