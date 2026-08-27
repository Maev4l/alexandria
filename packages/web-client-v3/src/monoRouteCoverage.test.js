import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { describe, expect, it } from 'vitest';

// CJS/ESM interop, same defensive unwrap as monoText.test.js and groundForeground.test.js.
const traverse = _traverse.default ?? _traverse;

// DRIFT ALARM for scripts/check-browser.mjs's `MONO_ROUTES` list (added at 431277a), per the
// design session's f7 task. That check walks a HAND-MAINTAINED set of routes and asserts every
// element resolving to Chivo Mono is digit-dominant (the mono is for
// numerals only). The list is complete today, but nothing says so mechanically — a future
// component that adds a `.num` class is invisible to it until someone remembers to add a route.
//
// This file closes that gap the other direction from monoText.test.js: monoText.test.js proves
// a STATIC property of each `.num` site (no literal word inside it); this file proves a
// STRUCTURAL property of the route list itself (every file that declares `.num` is reachable
// from at least one route MONO_ROUTES already visits). Deriving MONO_ROUTES's fixture instances
// mechanically was rejected in the task brief — those routes need specific fixture RECORDS (a
// lent item, a collection member with a year and a duration), not just "every route", so a
// route-landmark-style "visit everything" guard cannot replace the hand-picked list. What CAN be
// mechanical is whether that hand-picked list still covers every file that needs it, which is
// exactly what is checked below.
//
// MECHANISM: parse `src/routes.jsx` to recover its real route table (`<Route path>` ->
// `lazy(() => import(...))` component), match each concrete MONO_ROUTES path against that table
// to get an entry file, then follow `ImportDeclaration`s transitively (import graph, not runtime
// render) to build the set of files reachable from the routes MONO_ROUTES already visits. A file
// that declares `.num` and is not in that reachable set means MONO_ROUTES needs a new entry.
//
// WHAT THIS CANNOT SEE (stated once, precisely, because this project has shipped checks that
// looked broader than they were three times already):
//
// 1. A component reached only through a NON-STATIC specifier: a dynamic `import()` whose
//    argument is not a string literal, a component picked out of a runtime lookup table
//    (`{ [kind]: SomeComponent }[kind]`), or a `require()` call. `src/routes.jsx` is the only
//    file in this codebase using dynamic `import()` at all (checked: `grep -rn "lazy(\|import("
//    src` outside routes.jsx returns nothing), so this is a documented limit with no known live
//    instance, not a blind spot already being relied on.
// 2. A `.num` class assembled from a MODULE-LEVEL CONSTANT referenced by identifier inside a
//    `className` expression, e.g. `const BASE = 'num foo'; ... className={cn(BASE, x)}`. The
//    `.num` detector below (mirroring monoText.test.js's `classNameSource`) reads the literal
//    text inside the `className` attribute's own source span, so a literal written directly in
//    that span — including nested inside a `cn(...)` call, which is how every current `.num`
//    site in this codebase is written — is caught, but one hoisted to a separate identifier
//    would not be. No current file does this (verified by reading all seven files list below).
// 3. Barrel re-exports (`export * from './x.jsx'`) — not used anywhere in `src/` today (verified:
//    `grep -rn "export \*" src` returns nothing) — would hide the real defining file behind the
//    barrel's own filename, which carries no `.num` itself.
// 4. Import-graph reachability is necessary, not sufficient, for the BROWSER check's fixture to
//    actually render digit-bearing mono text at that route: a route can statically import a
//    component whose `.num` span only renders on a runtime branch the chosen fixture never hits
//    (e.g. an item with no lending history). That is exactly the judgement call the task brief
//    says cannot be automated — this guard only proves the file is on the route's import graph,
//    which is what stops it from being silently dropped, not that the fixture exercises it.

const SRC_DIR = path.resolve(process.cwd(), 'src');
const ROUTES_FILE = path.resolve(SRC_DIR, 'routes.jsx');
const CHECK_BROWSER_FILE = path.resolve(process.cwd(), 'scripts/check-browser.mjs');

const parseFile = (file) => parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });

// --- Extract MONO_ROUTES straight from the script that owns it, so this guard cannot drift from
// the browser check by retyping the list. Fails loudly (not silently-empty) if the declaration's
// shape ever changes, per this project's "an exclusion/assumption is a measurement, not a guess"
// rule extended to "an extraction is a parse, not a copy."
const extractMonoRoutes = () => {
  const ast = parseFile(CHECK_BROWSER_FILE);
  let routes = null;
  traverse(ast, {
    VariableDeclarator(nodePath) {
      if (nodePath.node.id.type !== 'Identifier' || nodePath.node.id.name !== 'MONO_ROUTES') return;
      const init = nodePath.node.init;
      if (init?.type !== 'ArrayExpression') {
        throw new Error('MONO_ROUTES in scripts/check-browser.mjs is no longer an array literal.');
      }
      routes = init.elements.map((el) => {
        if (el?.type !== 'StringLiteral') {
          throw new Error(`MONO_ROUTES element is not a string literal (found ${el?.type}).`);
        }
        return el.value;
      });
    },
  });
  if (routes == null) {
    throw new Error(
      'Could not find `const MONO_ROUTES = [...]` in scripts/check-browser.mjs — has it been renamed?',
    );
  }
  return routes;
};

// --- Resolve an import specifier to a file on disk. `@/` is the Vite/Vitest alias for `src/`
// (vite.config.js, vitest config); anything else starting with `.` is relative to the importing
// file; a bare specifier (react, dayjs, react-router-dom, ...) is a package and is not followed.
const resolveWithExtensions = (base) => {
  for (const candidate of [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx'), path.join(base, 'index.js')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
};

const resolveImportSource = (source, fromFile) => {
  if (source.startsWith('@/')) return resolveWithExtensions(path.join(SRC_DIR, source.slice(2)));
  if (source.startsWith('.')) return resolveWithExtensions(path.resolve(path.dirname(fromFile), source));
  return null; // package import, not part of this codebase's own reachability graph
};

// --- routes.jsx has two things this guard needs: which local name each lazily-loaded page
// component resolves to, and which URL pattern each <Route> maps that name onto.
const extractLazyImports = (ast) => {
  const map = {};
  traverse(ast, {
    VariableDeclarator(nodePath) {
      const { id, init } = nodePath.node;
      if (id.type !== 'Identifier' || init?.type !== 'CallExpression') return;
      if (init.callee.type !== 'Identifier' || init.callee.name !== 'lazy') return;
      const arrow = init.arguments[0];
      if (arrow?.type !== 'ArrowFunctionExpression') return;
      const call = arrow.body;
      // Babel represents dynamic `import(...)` as a CallExpression whose callee is the `Import`
      // (older) or `ImportExpression` (newer) node type — accept either rather than pinning one.
      if (call?.type !== 'CallExpression' || !['Import', 'ImportExpression'].includes(call.callee.type)) return;
      const arg = call.arguments[0];
      if (arg?.type !== 'StringLiteral') return; // non-literal specifier: documented blind spot #1
      map[id.name] = arg.value;
    },
  });
  return map;
};

const jsxTagName = (openingElement) => {
  const name = openingElement.name;
  return name.type === 'JSXIdentifier' ? name.name : null;
};

// A <Route>'s `element` is either `<Name />` directly, or `guard(<Name />)`. Both shapes carry
// exactly one JSXElement naming the page component; find it regardless of the wrapper.
const extractComponentName = (expr) => {
  if (expr?.type === 'JSXElement') return jsxTagName(expr.openingElement);
  if (expr?.type === 'CallExpression') {
    for (const arg of expr.arguments) {
      const found = extractComponentName(arg);
      if (found) return found;
    }
  }
  return null;
};

const extractRouteDefs = (ast) => {
  const defs = [];
  traverse(ast, {
    JSXElement(nodePath) {
      const opening = nodePath.node.openingElement;
      if (jsxTagName(opening) !== 'Route') return;
      const attrs = opening.attributes ?? [];
      const pathAttr = attrs.find((a) => a.type === 'JSXAttribute' && a.name?.name === 'path');
      const elementAttr = attrs.find((a) => a.type === 'JSXAttribute' && a.name?.name === 'element');
      if (pathAttr?.value?.type !== 'StringLiteral') return;
      if (elementAttr?.value?.type !== 'JSXExpressionContainer') return;
      const componentName = extractComponentName(elementAttr.value.expression);
      if (!componentName) return; // e.g. the catch-all `<Navigate .../>` — not a page component
      defs.push({ pattern: pathAttr.value.value, componentName });
    },
  });
  return defs;
};

// Converts a route pattern ("/libraries/:libraryId/items/:itemId") into a matcher for a concrete
// path. Segment-by-segment, not a single regex over the whole string, so a literal segment that
// happens to contain regex metacharacters is escaped rather than misinterpreted.
const routeMatches = (pattern, concretePath) => {
  const patternSegs = pattern.split('/');
  const pathSegs = concretePath.split('/');
  if (patternSegs.length !== pathSegs.length) return false;
  return patternSegs.every((seg, i) => seg.startsWith(':') || seg === pathSegs[i]);
};

// Resolves one concrete MONO_ROUTES path to the absolute file of the page component that route
// renders. Every failure mode throws with the specific fact that broke, so a future edit to
// routes.jsx (rename, restructure, remove a route MONO_ROUTES still names) fails LOUDLY here
// rather than the coverage check below silently treating a missing entry as "nothing to check."
const resolveRouteToFile = (concretePath, routeDefs, lazyImports) => {
  const matches = routeDefs.filter((def) => routeMatches(def.pattern, concretePath));
  if (matches.length === 0) {
    throw new Error(
      `MONO_ROUTES route "${concretePath}" matches no <Route path> in routes.jsx — the route ` +
        'table has drifted from the hand-maintained mono-text route list.',
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `MONO_ROUTES route "${concretePath}" matches more than one <Route path> in routes.jsx ` +
        `(${matches.map((m) => m.pattern).join(', ')}) — ambiguous.`,
    );
  }
  const { componentName } = matches[0];
  const importSource = lazyImports[componentName];
  if (!importSource) {
    throw new Error(
      `Route component "${componentName}" (for MONO_ROUTES route "${concretePath}") has no ` +
        '`const X = lazy(() => import(...))` declaration in routes.jsx.',
    );
  }
  const resolved = resolveImportSource(importSource, ROUTES_FILE);
  if (!resolved) {
    throw new Error(`Could not resolve import "${importSource}" from routes.jsx to a file on disk.`);
  }
  return resolved;
};

// --- The import graph. Static `import ... from '...'` declarations only (documented blind spots
// #1 and #3 above cover what this does not follow).
const importsOf = (file) => {
  const sources = [];
  traverse(parseFile(file), {
    ImportDeclaration(nodePath) {
      sources.push(nodePath.node.source.value);
    },
  });
  return sources;
};

const transitiveClosureFrom = (entryFiles) => {
  const visited = new Set();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    for (const source of importsOf(file)) {
      const resolved = resolveImportSource(source, file);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return visited;
};

// --- Files that actually declare `.num`, detected the same way monoText.test.js does: the
// literal text inside a JSX element's own `className` attribute span, word-bounded so `numbers`,
// `numeral` etc. (all over this codebase's comments, none of them a class) never match. This
// deliberately does NOT use `grep -rl '\bnum\b' src` (mentioned in the task brief as a one-off
// manual review) — that plain-text grep also matches the word `.num` INSIDE COMMENTS, which
// inflates the file count without inflating what needs route coverage. MEASURED: three of the
// ten files grep matches — LibraryRow.jsx, LibraryBrowse.jsx, UnshareLibrary.jsx — carry no
// `className="num…"` anywhere; each only mentions `.num` in a comment explaining why it does
// NOT use the class (e.g. UnshareLibrary.jsx: "This used to carry `.num`... [now fixed]"). Using
// the AST-precise definition here, rather than the looser grep, is exactly this project's own
// rule about an exclusion needing a measurement — building the alarm on the looser definition
// would flag files that need no route at all, and the next contributor would have good reason to
// delete an alarm that cries wolf.
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

describe('every file declaring the `.num` mono class is reachable from a MONO_ROUTES route', () => {
  const monoRoutes = extractMonoRoutes();
  const routesAst = parseFile(ROUTES_FILE);
  const lazyImports = extractLazyImports(routesAst);
  const routeDefs = extractRouteDefs(routesAst);

  it('MONO_ROUTES is non-empty and every entry resolves to a real routes.jsx component', () => {
    expect(monoRoutes.length).toBeGreaterThan(0);
    // Resolving is the assertion: resolveRouteToFile throws with the specific drift if any
    // MONO_ROUTES entry no longer matches routes.jsx's real table.
    for (const route of monoRoutes) {
      expect(() => resolveRouteToFile(route, routeDefs, lazyImports)).not.toThrow();
    }
  });

  const entryFiles = monoRoutes.map((route) => resolveRouteToFile(route, routeDefs, lazyImports));
  const reachable = transitiveClosureFrom(entryFiles);

  // THE OTHER DIRECTION, and it was missing. The check below proves every `.num` file is
  // reachable from SOME route; nothing proved a listed route reaches any `.num` at all. So an
  // entry whose screen stops rendering numerals goes on passing, contributing nothing, and looks
  // exactly like an entry that is doing work — the fourth shape of "green for the wrong reason"
  // this project has found, and the one it has agreed to stop shipping.
  //
  // Live instance: `/settings/account` printed the reader's `custom:Id` until that section was
  // removed. Without this assertion the route would have stayed in the manifest for ever, and a
  // later reader would reasonably have concluded the account screen has mono content to protect.
  it('every MONO_ROUTES entry reaches at least one `.num` file — no vacuous entries', () => {
    const vacuous = monoRoutes.filter((route) => {
      const files = transitiveClosureFrom([resolveRouteToFile(route, routeDefs, lazyImports)]);
      return ![...files].some((file) => declaresNumClass(file));
    });
    expect(vacuous).toEqual([]);
  });

  const numFiles = listJsxFiles(SRC_DIR).filter(declaresNumClass);

  it('found more than zero files declaring `.num` (guards against this scan silently finding nothing)', () => {
    expect(numFiles.length).toBeGreaterThan(0);
  });

  it('every file declaring `.num` is on the import graph of at least one MONO_ROUTES route', () => {
    const uncovered = numFiles.filter((f) => !reachable.has(f)).map((f) => path.relative(SRC_DIR, f));
    expect(uncovered).toEqual([]);
  });
});
