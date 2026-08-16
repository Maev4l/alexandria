import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { describe, expect, it } from 'vitest';

// CJS/ESM interop, same defensive unwrap as groundForeground.test.js.
const traverse = _traverse.default ?? _traverse;

// Mechanism for DESIGN.md section 3: "the mono is for numerals only... a person's name set in
// the mono is a category error." That rule was invisible for weeks because both shipped fonts
// were near-empty and resolved to the same `system-ui` fallback (fixed in 20d2db7) — every
// violation of the split looked identical to compliance until the fonts actually differed.
//
// This scans every .jsx source for a `.num`-classed element that renders a LITERAL word beside
// its numeral — the exact shape of both bugs this sweep found: LedgerRow's duration used to read
// `<span className="num">{days} days</span>` (a literal " days" JSXText inside the mono span),
// and IndexLetter's count used to read `{count} {count === 1 ? 'volume' : 'volumes'}` inside one
// `.num` span (a literal string in a ternary branch). Both are STATIC — the word was written
// directly in the JSX at the call site — so an AST scan catches them.
//
// What this CANNOT catch: a word that arrives as a runtime value through a prop or a function
// call — UnshareLibrary.jsx's `<span className="num">{email}</span>` renders an address that is
// only ever a variable at this call site, never a string literal, so this scan is structurally
// blind to it (flagged instead in .superpowers/sdd/2026-08-13-web-client-v3/f4-report.md). A
// partial check that catches every literal and misses every interpolated one is still worth
// having — it is exactly the shape both fixed bugs took — but it is not a substitute for reading
// the rendered output, which is why this sweep also shot the screens by hand.
const NUM_CLASS = /\bnum\b/;
// An element that explicitly re-declares its own font opts back into the sans, the same idiom
// ItemForm.jsx's `remaining()` uses for "left" beside a `.num`-wrapped figure — content nested
// inside it is that element's own responsibility, not this ancestor's.
const FONT_OVERRIDE = /\bfont-sans\b/;

const SRC_DIR = path.resolve(process.cwd(), 'src');

// Held by a concurrent session as of this sweep (2026-08-16) — out of scope to edit here.
// UnshareLibrary.jsx has a known, reported violation (a recipient's email address rendered
// inside `.num`); excluding it keeps this guard green today rather than failing on a defect this
// session is barred from fixing. Remove the exclusion once that session's own fix lands, so the
// guard resumes covering the file — see .superpowers/sdd/2026-08-13-web-client-v3/f4-report.md.
const HELD_FILES = new Set(['pages/UnshareLibrary.jsx']);

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
  return code.slice(attr.value.start, attr.value.end);
};

// A word, not a numeral: any Unicode letter. Digits, `·`, `′`, punctuation and whitespace all
// pass through clean — a bare figure or a unit mark is exactly what `.num` is FOR.
const containsWord = (text) => /\p{L}/u.test(text);

// Collects every literal string a `.num`-classed element renders, stopping at whatever already
// declares its own font (an override span) or is a component (checked independently when ITS
// own file is scanned — this pass never resolves imports, same limit groundForeground.test.js
// documents for the same reason).
const collectLiterals = (node, code, acc) => {
  if (node == null) return;
  switch (node.type) {
    case 'JSXText':
      acc.push(node.value);
      return;
    case 'StringLiteral':
      acc.push(node.value);
      return;
    case 'TemplateLiteral':
      for (const quasi of node.quasis) acc.push(quasi.value.raw);
      return;
    case 'ConditionalExpression':
      collectLiterals(node.consequent, code, acc);
      collectLiterals(node.alternate, code, acc);
      return;
    case 'LogicalExpression': // `condition && 'literal'`
      collectLiterals(node.right, code, acc);
      return;
    case 'JSXExpressionContainer':
      if (node.expression.type !== 'JSXEmptyExpression') collectLiterals(node.expression, code, acc);
      return;
    case 'JSXFragment':
      for (const child of node.children) collectLiterals(child, code, acc);
      return;
    case 'JSXElement': {
      const raw = classNameSource(node.openingElement, code);
      if (FONT_OVERRIDE.test(raw)) return; // opted back into the sans; its own problem if wrong
      if (isCapitalized(tagName(node.openingElement))) return; // a component, not this file's text
      for (const child of node.children) collectLiterals(child, code, acc);
      return;
    }
    default:
      // Identifiers, member/call expressions, etc.: runtime values. Cannot be checked statically
      // — this is the documented gap (an interpolated word is invisible to this scan).
  }
};

const findViolations = (file) => {
  const code = fs.readFileSync(file, 'utf8');
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  const violations = [];

  traverse(ast, {
    JSXElement(nodePath) {
      const el = nodePath.node;
      const raw = classNameSource(el.openingElement, code);
      if (!NUM_CLASS.test(raw)) return;

      const literals = [];
      for (const child of el.children) collectLiterals(child, code, literals);
      const words = literals.filter(containsWord);
      if (words.length === 0) return;

      violations.push(
        `${path.relative(SRC_DIR, file)}:${el.loc.start.line} — \`.num\` renders a literal ` +
          `word: ${JSON.stringify(words.join(''))}`,
      );
    },
  });

  return violations;
};

describe('mono text (DESIGN.md section 3, "the mono is for numerals only")', () => {
  const files = listSourceFiles(SRC_DIR).filter(
    (file) => !HELD_FILES.has(path.relative(SRC_DIR, file)),
  );

  it('found more than zero .jsx files to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('never renders a literal word inside a `.num`-classed element', () => {
    const violations = files.flatMap(findViolations);
    expect(violations).toEqual([]);
  });
});
