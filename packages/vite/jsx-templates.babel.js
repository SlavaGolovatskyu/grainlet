/**
 * Babel plugin: compile static HTML-only JSX trees to template()+cloneNode.
 *
 * After wrap-jsx-accessors, transforms trees like:
 *   <tr class={() => ...} data-id={() => ...}><td>{() => row.id}</td></tr>
 * into:
 *   mountTemplate(_tmpl$, (el) => { bind…; })
 *
 * Skips trees that contain components (uppercase tags), spreads, or fragments.
 */

const HOLE = ' ';

function isEventAttrName(name) {
  if (typeof name !== 'string' || name.length < 3) return false;
  if (name.toLowerCase() === 'once') return false;
  return /^on[a-z]/i.test(name);
}

function getTagName(openingEl, t) {
  const name = openingEl.name;
  if (t.isJSXIdentifier(name)) return name.name;
  return null;
}

function isHostTag(name) {
  return typeof name === 'string' && /^[a-z]/.test(name);
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * After wrap-jsx-accessors, child expressions are usually `() => …`.
 * Only treat simple signal/string reads as text holes — variables like
 * `outlet` / `props.children` and calls like `.map()` are structured children.
 */
function isLikelyTextHole(expr, t) {
  if (!expr || t.isJSXEmptyExpression(expr)) return false;

  let body = expr;
  if (t.isArrowFunctionExpression(expr)) {
    if (t.isBlockStatement(expr.body)) return false;
    body = expr.body;
  }

  if (t.isStringLiteral(body) || t.isNumericLiteral(body)) return true;
  if (t.isTemplateLiteral(body)) return true;
  if (t.isBinaryExpression(body) || t.isUnaryExpression(body)) return true;

  // signal() / obj.prop() with no args — typical text accessor
  if (t.isCallExpression(body) && body.arguments.length === 0) {
    if (t.isIdentifier(body.callee) || t.isMemberExpression(body.callee)) {
      return true;
    }
  }

  // Identifiers (outlet, children), .map(...), conditionals → not text
  return false;
}

/**
 * Returns false if this JSX element (or descendant) cannot be templated.
 */
function canTemplateElement(jsxElPath, t) {
  const el = jsxElPath.node;
  if (!t.isJSXElement(el)) return false;
  const tag = getTagName(el.openingElement, t);
  if (!isHostTag(tag)) return false;

  for (const attr of el.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) return false;
  }

  for (const child of el.children) {
    if (t.isJSXElement(child)) {
      const childPath = jsxElPath
        .get('children')
        .find((p) => p.node === child);
      if (!childPath || !canTemplateElement(childPath, t)) return false;
    } else if (t.isJSXFragment(child)) {
      return false;
    } else if (t.isJSXSpreadChild?.(child)) {
      return false;
    } else if (t.isJSXExpressionContainer(child)) {
      if (t.isJSXEmptyExpression(child.expression)) continue;
      if (!isLikelyTextHole(child.expression, t)) return false;
    }
  }
  return true;
}

/**
 * Build HTML string + hole descriptors while walking a static host tree.
 * path is an array of sibling indices from the root (firstChild/nextSibling).
 */
function compileElement(jsxEl, path, holes, t) {
  const tag = getTagName(jsxEl.openingElement, t);
  let html = `<${tag}`;
  const selfPath = path.slice();

  for (const attr of jsxEl.openingElement.attributes) {
    if (!t.isJSXAttribute(attr)) continue;
    const rawName = t.isJSXIdentifier(attr.name)
      ? attr.name.name
      : attr.name?.name;
    if (!rawName || rawName === 'ref') continue;

    const propName =
      rawName === 'class' || rawName === 'className' ? 'className' : rawName;

    if (isEventAttrName(rawName)) {
      if (attr.value && t.isJSXExpressionContainer(attr.value)) {
        holes.push({
          kind: 'event',
          path: selfPath,
          name: rawName,
          expr: attr.value.expression,
        });
      }
      continue;
    }

    if (!attr.value) {
      // boolean true
      html += ` ${rawName === 'className' ? 'class' : rawName}`;
      continue;
    }

    if (t.isStringLiteral(attr.value)) {
      const attrKey = rawName === 'className' ? 'class' : rawName;
      html += ` ${attrKey}="${escapeAttr(attr.value.value)}"`;
      continue;
    }

    if (t.isJSXExpressionContainer(attr.value)) {
      const expr = attr.value.expression;
      if (t.isStringLiteral(expr) || t.isNumericLiteral(expr)) {
        const attrKey = rawName === 'className' ? 'class' : rawName;
        html += ` ${attrKey}="${escapeAttr(expr.value)}"`;
        continue;
      }
      // Dynamic attr — bind after clone
      holes.push({
        kind: 'prop',
        path: selfPath,
        name: propName,
        expr,
      });
      continue;
    }
  }

  if (jsxEl.openingElement.selfClosing && jsxEl.children.length === 0) {
    html += `></${tag}>`;
    return html;
  }

  html += '>';

  let childIndex = 0;
  for (const child of jsxEl.children) {
    if (t.isJSXText(child)) {
      const text = child.value.replace(/\s+/g, ' ');
      // Preserve meaningful text; drop whitespace-only between tags.
      if (text.trim() === '') {
        // Skip pure whitespace — browsers may not create text nodes for it
        // the same way in all cases when using innerHTML.
        continue;
      }
      html += escapeText(text);
      childIndex++;
      continue;
    }

    if (t.isJSXExpressionContainer(child)) {
      if (t.isJSXEmptyExpression(child.expression)) continue;
      // Dynamic child → text hole
      html += HOLE;
      holes.push({
        kind: 'text',
        path: selfPath.concat(childIndex),
        expr: child.expression,
      });
      childIndex++;
      continue;
    }

    if (t.isJSXElement(child)) {
      html += compileElement(child, selfPath.concat(childIndex), holes, t);
      childIndex++;
      continue;
    }
  }

  html += `</${tag}>`;
  return html;
}

function pathToAst(pathArr, t) {
  return t.arrayExpression(pathArr.map((n) => t.numericLiteral(n)));
}

export default function jsxTemplates({ types: t }) {
  return {
    name: 'grainlet-jsx-templates',
    visitor: {
      Program: {
        enter(programPath, state) {
          state.file.set('grainTemplateCounter', 0);
          state.file.set('grainTemplateImports', null);
        },
        exit(programPath, state) {
          const ids = state.file.get('grainTemplateImports');
          if (!ids) return;

          const importDecl = t.importDeclaration(
            [
              t.importSpecifier(ids.template, t.identifier('template')),
              t.importSpecifier(ids.mountTemplate, t.identifier('mountTemplate')),
              t.importSpecifier(ids.bindText, t.identifier('bindTemplateText')),
              t.importSpecifier(ids.bindProp, t.identifier('bindTemplateProp')),
              t.importSpecifier(ids.bindEvent, t.identifier('bindTemplateEvent')),
              t.importSpecifier(ids.walkPath, t.identifier('walkPath')),
            ],
            t.stringLiteral('grainlet/jsx-runtime')
          );
          programPath.unshiftContainer('body', importDecl);
        },
      },

      JSXElement(path, state) {
        // Only transform maximal host trees: parent is not a host JSXElement
        // we would also template (i.e. transform roots of static subtrees).
        const parent = path.parentPath;
        if (parent.isJSXElement()) {
          const parentTag = getTagName(parent.node.openingElement, t);
          if (isHostTag(parentTag) && canTemplateElement(parent, t)) {
            // Parent will absorb this child into its HTML string.
            return;
          }
        }

        if (!canTemplateElement(path, t)) return;

        // Skip trivial single-element with no dynamics? Still benefit from clone
        // for repeated For rows — always template eligible host trees.
        // Avoid templating the entire App shell once: only transform when the
        // element has at least one dynamic hole OR sits inside a function
        // (row callback). Heuristic: transform if it has dynamics, or if
        // ancestor is ArrowFunctionExpression / FunctionExpression.
        const holes = [];
        const html = compileElement(path.node, [], holes, t);

        const inFn = path.findParent(
          (p) => p.isArrowFunctionExpression() || p.isFunctionExpression()
        );
        if (holes.length === 0 && !inFn) {
          // Static top-level chrome — leave as vnode jsx() for simplicity.
          return;
        }

        let ids = state.file.get('grainTemplateImports');
        if (!ids) {
          ids = {
            template: path.scope.generateUidIdentifier('_$$t'),
            mountTemplate: path.scope.generateUidIdentifier('_$$m'),
            bindText: path.scope.generateUidIdentifier('_$$bt'),
            bindProp: path.scope.generateUidIdentifier('_$$bp'),
            bindEvent: path.scope.generateUidIdentifier('_$$be'),
            walkPath: path.scope.generateUidIdentifier('_$$w'),
          };
          state.file.set('grainTemplateImports', ids);
        }

        let counter = state.file.get('grainTemplateCounter') || 0;
        const tmplId = path.scope.generateUidIdentifier(`_tmpl$${counter}`);
        state.file.set('grainTemplateCounter', counter + 1);

        // Hoist: const _tmpl$0 = _$$t(`...`);
        const tmplDecl = t.variableDeclaration('const', [
          t.variableDeclarator(
            tmplId,
            t.callExpression(ids.template, [t.stringLiteral(html)])
          ),
        ]);
        const program = path.findParent((p) => p.isProgram());
        program.unshiftContainer('body', tmplDecl);

        const elId = path.scope.generateUidIdentifier('el');
        const setupBody = [];

        for (const hole of holes) {
          const targetExpr =
            hole.path.length === 0
              ? elId
              : t.callExpression(ids.walkPath, [
                  elId,
                  pathToAst(hole.path, t),
                ]);

          if (hole.kind === 'text') {
            setupBody.push(
              t.expressionStatement(
                t.callExpression(ids.bindText, [
                  targetExpr,
                  // Ensure accessor: wrap if not already a function
                  t.isArrowFunctionExpression(hole.expr) ||
                  t.isFunctionExpression(hole.expr)
                    ? hole.expr
                    : t.arrowFunctionExpression([], hole.expr),
                ])
              )
            );
          } else if (hole.kind === 'prop') {
            setupBody.push(
              t.expressionStatement(
                t.callExpression(ids.bindProp, [
                  targetExpr,
                  t.stringLiteral(hole.name),
                  t.isArrowFunctionExpression(hole.expr) ||
                  t.isFunctionExpression(hole.expr)
                    ? hole.expr
                    : t.arrowFunctionExpression([], hole.expr),
                ])
              )
            );
          } else if (hole.kind === 'event') {
            setupBody.push(
              t.expressionStatement(
                t.callExpression(ids.bindEvent, [
                  targetExpr,
                  t.stringLiteral(hole.name),
                  hole.expr,
                ])
              )
            );
          }
        }

        const setupFn = t.arrowFunctionExpression(
          [elId],
          t.blockStatement(setupBody)
        );

        const replacement = t.callExpression(ids.mountTemplate, [
          tmplId,
          setupFn,
        ]);

        // Inside JSX, expressions must be wrapped in `{...}`.
        if (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment()) {
          path.replaceWith(t.jSXExpressionContainer(replacement));
        } else {
          path.replaceWith(replacement);
        }
      },
    },
  };
}
