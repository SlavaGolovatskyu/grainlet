/**
 * Babel plugin: wrap reactive JSX expressions for fine-grained DOM bindings.
 *
 *   {count()}        →  {() => count()}
 *   {`Hi ${name()}`} →  {() => `Hi ${name()}`}
 *   title={name()}   →  title={() => name()}
 *
 * Leave as-is:
 *   {count}              // signal getter already binds
 *   {() => count()}      // already an accessor
 *   onclick={handler}    // events
 *   ref={...}            // handled separately (see below)
 *   {show() && <div/>}   // control flow with JSX (needs parent re-render for now)
 *
 * Refs (Solid-compatible):
 *   ref={myEl}           →  ref={(el) => { myEl = el; }}
 *   ref={props.ref}      →  left as-is (do not wrap)
 *   ref={(el) => ...}    →  left as-is
 */

function containsJSX(path) {
  let found = false;
  path.traverse({
    JSXElement() {
      found = true;
    },
    JSXFragment() {
      found = true;
    },
  });
  return found;
}

function isEventAttrName(name) {
  if (typeof name !== 'string') return false;
  return name === 'onclick' || name === 'onClick' || /^on[A-Z]/.test(name);
}

/** Control-flow props owned by For/Show/Switch — do not wrap call expressions. */
const CONTROL_FLOW_ATTRS = new Set(['each', 'when']);

export default function wrapJsxAccessors({ types: t }) {
  function shouldWrap(exprPath) {
    const expr = exprPath.node;
    if (!expr) return false;
    if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) return false;
    if (t.isIdentifier(expr)) return false;
    if (
      t.isStringLiteral(expr) ||
      t.isNumericLiteral(expr) ||
      t.isBooleanLiteral(expr) ||
      t.isNullLiteral(expr) ||
      t.isBigIntLiteral(expr)
    ) {
      return false;
    }
    if (t.isJSXElement(expr) || t.isJSXFragment(expr)) return false;
    if (containsJSX(exprPath)) return false;
    // Structural slot — parent re-render supplies new children; do not text-bind.
    if (
      t.isMemberExpression(expr) &&
      !expr.computed &&
      t.isIdentifier(expr.property, { name: 'children' })
    ) {
      return false;
    }
    return true;
  }

  function wrap(expr) {
    return t.arrowFunctionExpression([], t.parenthesizedExpression(expr));
  }

  /** Solid-style: ref={ident} → ref={(el) => { ident = el; }} for let/var only.
   *  Leave const bindings (e.g. signal setters) as callable refs. */
  function transformRefAssignment(exprPath) {
    const expr = exprPath.node;
    if (!t.isIdentifier(expr)) return false;

    const binding = exprPath.scope.getBinding(expr.name);
    if (binding && binding.kind === 'const') {
      return false;
    }

    const el = t.identifier('el');
    exprPath.replaceWith(
      t.arrowFunctionExpression(
        [el],
        t.blockStatement([
          t.expressionStatement(
            t.assignmentExpression('=', t.identifier(expr.name), el)
          ),
        ])
      )
    );
    return true;
  }

  return {
    name: 'wrap-jsx-accessors',
    visitor: {
      JSXExpressionContainer(path) {
        const parent = path.parentPath;
        if (parent.isJSXAttribute()) {
          const nameNode = parent.node.name;
          const attrName = t.isJSXIdentifier(nameNode)
            ? nameNode.name
            : nameNode?.name;

          if (isEventAttrName(attrName)) return;

          // For/Show/Match: wrap each={data()} → () => data() so For owns the
          // subscription via readProp (eager each={data()} would freeze the list).
          // Do NOT wrap identifiers or props.x — those are already accessors;
          // wrapping each={props.cities} → () => props.cities makes readProp
          // return the getter function, and normalizeEach treats it as one item.
          if (CONTROL_FLOW_ATTRS.has(attrName)) {
            const cfExpr = path.get('expression');
            if (cfExpr.isJSXEmptyExpression()) return;
            if (cfExpr.isIdentifier() || cfExpr.isMemberExpression()) return;
            if (!shouldWrap(cfExpr)) return;
            cfExpr.replaceWith(wrap(cfExpr.node));
            return;
          }

          // Refs / imperative API refs: never wrap; rewrite bare identifiers to assignment callbacks.
          if (attrName === 'ref' || attrName === 'apiRef') {
            const exprPath = path.get('expression');
            if (exprPath.isJSXEmptyExpression()) return;
            if (
              t.isArrowFunctionExpression(exprPath.node) ||
              t.isFunctionExpression(exprPath.node)
            ) {
              return;
            }
            if (attrName === 'ref' && transformRefAssignment(exprPath)) return;
            return;
          }
        }

        const exprPath = path.get('expression');
        if (exprPath.isJSXEmptyExpression()) return;
        if (!shouldWrap(exprPath)) return;

        exprPath.replaceWith(wrap(exprPath.node));
      },
    },
  };
}
