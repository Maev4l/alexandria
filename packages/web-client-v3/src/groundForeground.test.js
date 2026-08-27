import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { describe, expect, it } from 'vitest';

// CJS/ESM interop: under Vitest's transform, @babel/traverse's default export sometimes lands
// wrapped an extra level deep (`{ default: [Function] }`), sometimes not, depending on which
// module system loaded it first. Unwrapping once, defensively, is cheaper than pinning the
// exact interop behaviour of a transitive dependency.
const traverse = _traverse.default ?? _traverse;

// Mechanism for the rule this guard actually enforces: a ground's text is coloured at or below
// it, and never inherited across a surface boundary. Written down mid-slice and then not applied
// to the next five blocks written after it, because the words alone did not catch the next
// violation; this scans every .jsx source file for the shape of the defect and fails the suite
// the moment it reappears.
//
// Bare `bg-paper` is deliberately NOT one of the checked tokens. Every current use of it is
// either the page canvas restated on a full-height route root (`min-h-dvh`/`h-dvh` beside it,
// which is `body`'s own background from index.css, not a nested surface) or a block that
// already pairs `text-ink` explicitly. Checking it produced nothing but false positives on
// ordinary page shells whose headings have never needed an explicit colour, because they have
// never disagreed with `body`'s own default. The five tokens below are the ones that paint a
// surface genuinely DIFFERENT from that default, which is exactly what made the shipped bug
// (Sheet's `bg-paper-deep` with no text colour, invisible the one time it opened over the
// black cover) reusable in the wrong place without complaint.
const BG_TOKENS = ['paper-deep', 'ink', 'imprint', 'out', 'shared', 'cover-body', 'cover-soft', 'cover-rule'];
// A foreground pairing may use any token, including `paper` itself (e.g. AppHeader's inverted
// branch: `bg-ink text-paper`) and `current` (PlateButton's outline variants, which deliberately
// follow whatever ink colour they are dropped into).
const TEXT_TOKENS = [...BG_TOKENS, 'paper', 'current'];

const bgPattern = new RegExp(`\\bbg-(${BG_TOKENS.join('|')})\\b`);
const textPattern = new RegExp(`\\btext-(${TEXT_TOKENS.join('|')})\\b`);

const SRC_DIR = path.resolve(process.cwd(), 'src');

const listSourceFiles = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.name.endsWith('.jsx') && !entry.name.endsWith('.test.jsx')) {
      out.push(full);
    }
  }
  return out;
};

const isCapitalized = (name) => /^[A-Z]/.test(name);

const tagName = (openingElement) => {
  const name = openingElement.name;
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return name.property.name;
  return '';
};

const classNameSource = (openingElement, code) => {
  const attr = (openingElement.attributes ?? []).find(
    (a) => a.type === 'JSXAttribute' && a.name?.name === 'className',
  );
  if (!attr?.value) return '';
  // Deliberately the raw source slice, not an evaluation of the expression: `cn(...)` calls,
  // ternaries and template literals all stay searchable as one string, which is what "the same
  // class expression" means here — a background and its foreground are read as declared
  // together the moment they are both present anywhere in the one className value, however it
  // was built.
  return code.slice(attr.value.start, attr.value.end);
};

// Collects the outermost JSXElement/JSXFragment nodes reachable from `node`, without descending
// once one is found — a found node's own children are ITS responsibility (checked when the
// caller recurses into it directly), not something to flatten into this scan.
const collectTopLevelJsx = (node, found = []) => {
  if (node == null || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    for (const n of node) collectTopLevelJsx(n, found);
    return found;
  }
  if (typeof node.type !== 'string') return found;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    found.push(node);
    return found;
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
    collectTopLevelJsx(node[key], found);
  }
  return found;
};

// True when `children` cannot possibly reach a reader as uncoloured text — every raw string,
// every dynamic value, and every nested element either declares its own foreground, is a new
// surface answerable for itself, or is a component (assumed to own its own styling, since this
// scan reads one file at a time and never resolves imports).
const childrenAreCovered = (children, code) => {
  for (const child of children) {
    if (child.type === 'JSXText') {
      if (child.value.trim() !== '') return false;
      continue;
    }
    if (child.type === 'JSXExpressionContainer') {
      if (child.expression.type === 'JSXEmptyExpression') continue; // a stray comment
      const nested = collectTopLevelJsx(child.expression);
      // No JSX anywhere inside the expression means it is a plain value — `{error}`,
      // `{item.title}`, a ternary between two strings — which renders as raw text with
      // whatever colour this element's own ancestors happen to supply.
      if (nested.length === 0) return false;
      for (const n of nested) if (!isCoveredElement(n, code)) return false;
      continue;
    }
    if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      if (!isCoveredElement(child, code)) return false;
      continue;
    }
    // JSXSpreadChild and friends do not occur in this codebase.
  }
  return true;
};

// Whether a JSXElement/JSXFragment nested inside a surface's children can be trusted to have
// already coloured whatever text it holds.
const isCoveredElement = (node, code) => {
  if (node.type === 'JSXFragment') return childrenAreCovered(node.children, code);
  const tag = tagName(node.openingElement);
  if (isCapitalized(tag)) return true; // a component — not this scan's business
  const raw = classNameSource(node.openingElement, code);
  if (textPattern.test(raw)) return true; // declares its own foreground
  if (bgPattern.test(raw)) return true; // a new surface; the top-level walk checks IT separately
  return childrenAreCovered(node.children, code);
};

const findViolations = (file) => {
  const code = fs.readFileSync(file, 'utf8');
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  const violations = [];

  traverse(ast, {
    JSXElement(nodePath) {
      const el = nodePath.node;
      const raw = classNameSource(el.openingElement, code);
      if (!bgPattern.test(raw)) return;
      if (textPattern.test(raw)) return; // already pairs its own foreground

      // Decorative marks — edge rules, skeleton shimmer bars — render no text of their own, so
      // there is nothing for this element to have left uncoloured.
      const hasRenderableChild = el.children.some(
        (c) => !(c.type === 'JSXText' && c.value.trim() === ''),
      );
      if (!hasRenderableChild) return;

      if (childrenAreCovered(el.children, code)) return;

      const match = raw.match(bgPattern);
      violations.push(
        `${path.relative(SRC_DIR, file)}:${el.loc.start.line} — sets \`${match[0]}\` with no ` +
          'paired foreground colour reachable by the text it renders',
      );
    },
  });

  return violations;
};

describe('ground/foreground pairing (DESIGN.md section 2, "sets a ground sets its foreground")', () => {
  const files = listSourceFiles(SRC_DIR);

  it('found more than zero .jsx files to check', () => {
    // A check that silently scans nothing is worse than no check.
    expect(files.length).toBeGreaterThan(20);
  });

  it('never paints a background without also painting the foreground of the text it holds', () => {
    const violations = files.flatMap(findViolations);
    expect(violations).toEqual([]);
  });
});
