import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { describe, expect, it } from 'vitest';

// CJS/ESM interop, same defensive unwrap as monoText.test.js, monoRouteCoverage.test.js and
// groundForeground.test.js.
const traverse = _traverse.default ?? _traverse;

// DRIFT ALARM for scripts/check-browser.mjs's `MONO_FIELDS` manifest (added alongside this
// file). That manifest closes the gap monoRouteCoverage.test.js's own drift alarm cannot: it
// takes each catalogue field's real VALUE from the fixtures and asserts it renders in Chivo Mono
// wherever it appears on a known route, rather than asking "is this hand-picked SITE mono" —
// so a brand-new component on an already-visited route that renders a field in the sans is
// caught with no new registration at all.
//
// But the manifest is still a hand-maintained LIST of fields, and a list can fall behind the
// same way MONO_ROUTES could: a new `.num` site can appear in `src/` with nobody adding a
// MONO_FIELDS entry naming the file it lives in. This file is that alarm, built the same way
// monoRouteCoverage.test.js's is — by proving a STRUCTURAL property (every file that declares
// `.num` is named as a `sourceFile` in the manifest) rather than a behavioural one (the browser
// script itself proves the manifest's entries are actually correct at runtime).
//
// MECHANISM: parse `scripts/check-browser.mjs`, extract `const MONO_FIELDS = [...]`, read each
// object's `sourceFile` string literal, and diff that set against every file in `src/` that
// declares a literal `.num` class (same AST-precise definition monoRouteCoverage.test.js uses,
// for the same reason: a plain-text grep for `\bnum\b` also matches the word inside COMMENTS
// explaining why a file does NOT use the class — three files in this codebase do exactly that —
// which would inflate the file count without inflating what needs a manifest entry).
//
// WHAT THIS CANNOT SEE (stated once, precisely, because a check that looks broader than it is
// has bitten this project three times already — an exclusion that was a no-op, a wrap assertion
// that could not fail, and MONO_ROUTES's own route-list blind spots):
//
// 1. Everything scripts/check-browser.mjs's own "WHAT THIS STILL CANNOT SEE" comment states
//    about the manifest's RUNTIME behaviour — a field checked on the wrong route, a wholly new
//    field with no entry at all, a coincidental text collision. This file only proves the
//    manifest's `sourceFile` LIST is not missing a file; it does not run a browser and cannot
//    tell whether any one entry's (route, expected) pair is actually correct.
// 2. Every blind spot monoRouteCoverage.test.js already documents for the identical extraction
//    mechanism applied to a hand-maintained array: a component reached only through a
//    non-static specifier, a `.num` class assembled from a hoisted identifier rather than a
//    literal in the `className` attribute's own source span, and barrel re-exports. None of
//    these has a known live instance in this codebase (same verification: every current `.num`
//    site is a literal directly in a `className`/`class` attribute, checked by reading all
//    eight files below), but the mechanism does not see past them if one is ever introduced.
// 3. A `sourceFile` entry that no longer exists, or that no longer declares `.num` at all (the
//    manifest pointing at a file that has since been refactored) — this only checks the
//    DIRECTION "every `.num` file has an entry", never the reverse. A stale entry is harmless to
//    this alarm (it just means the manifest's own coverage sentence is over-generous, not
//    wrong), so it is not asserted against.

const SRC_DIR = path.resolve(process.cwd(), 'src');
const CHECK_BROWSER_FILE = path.resolve(process.cwd(), 'scripts/check-browser.mjs');

const parseFile = (file) => parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });

// --- Extract MONO_FIELDS straight from the script that owns it, so this guard cannot drift from
// the browser check by retyping the list (same principle monoRouteCoverage.test.js's own
// `extractMonoRoutes` states for MONO_ROUTES). Only `sourceFile` is read — the other properties
// (`route`, `query`, `expected`) are frequently non-literal expressions (`String(item.releaseYear)`,
// a template literal) that this alarm has no need to evaluate, since its only question is which
// FILES the manifest names.
const extractMonoFields = () => {
  const ast = parseFile(CHECK_BROWSER_FILE);
  let sourceFiles = null;

  traverse(ast, {
    VariableDeclarator(nodePath) {
      if (nodePath.node.id.type !== 'Identifier' || nodePath.node.id.name !== 'MONO_FIELDS') return;
      const init = nodePath.node.init;
      if (init?.type !== 'ArrayExpression') {
        throw new Error('MONO_FIELDS in scripts/check-browser.mjs is no longer an array literal.');
      }
      sourceFiles = init.elements.map((el, index) => {
        if (el?.type !== 'ObjectExpression') {
          throw new Error(`MONO_FIELDS[${index}] is not an object literal (found ${el?.type}).`);
        }
        const prop = el.properties.find(
          (p) => p.type === 'ObjectProperty' && p.key.type === 'Identifier' && p.key.name === 'sourceFile',
        );
        if (prop?.value?.type !== 'StringLiteral') {
          throw new Error(`MONO_FIELDS[${index}] has no string-literal \`sourceFile\` property.`);
        }
        return prop.value.value;
      });
    },
  });

  if (sourceFiles == null) {
    throw new Error(
      'Could not find `const MONO_FIELDS = [...]` in scripts/check-browser.mjs — has it been renamed?',
    );
  }
  return sourceFiles;
};

// --- Files that actually declare `.num` — identical detection to monoRouteCoverage.test.js's
// own `declaresNumClass`/`listJsxFiles` (duplicated rather than imported: these are test-only
// helpers with no production caller, and the two guards check different things with the same
// small primitive, the same way monoText.test.js and monoRouteCoverage.test.js already each
// carry their own copy of the CJS/ESM interop line above).
const NUM_CLASS = /\bnum\b/;

const listJsxFiles = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsxFiles(full));
    else if (entry.name.endsWith('.jsx') && !entry.name.endsWith('.test.jsx')) out.push(full);
  }
  return out;
};

const declaresNumClass = (file) => {
  const code = fs.readFileSync(file, 'utf8');
  let found = false;
  traverse(parse(code, { sourceType: 'module', plugins: ['jsx'] }), {
    JSXOpeningElement(nodePath) {
      const attr = (nodePath.node.attributes ?? []).find(
        (a) => a.type === 'JSXAttribute' && a.name?.name === 'className',
      );
      if (attr?.value && NUM_CLASS.test(code.slice(attr.value.start, attr.value.end))) found = true;
    },
  });
  return found;
};

describe('every file declaring the `.num` mono class is named in the MONO_FIELDS manifest', () => {
  const sourceFiles = extractMonoFields();
  // Repo-relative, POSIX-separated, to match how scripts/check-browser.mjs writes them —
  // comparing absolute, platform-native paths against those literals would never match at all.
  const sourceFileSet = new Set(sourceFiles);

  it('MONO_FIELDS is non-empty', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  const numFiles = listJsxFiles(SRC_DIR).filter(declaresNumClass);

  it('found more than zero files declaring `.num` (guards against this scan silently finding nothing)', () => {
    expect(numFiles.length).toBeGreaterThan(0);
  });

  it('every file declaring `.num` is named as a `sourceFile` somewhere in MONO_FIELDS', () => {
    const uncovered = numFiles
      .map((f) => `src/${path.relative(SRC_DIR, f).split(path.sep).join('/')}`)
      .filter((rel) => !sourceFileSet.has(rel));
    expect(uncovered).toEqual([]);
  });
});
