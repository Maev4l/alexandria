import fs from 'fs';
import path from 'path';
import os from 'os';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { describe, expect, it } from 'vitest';

// CJS/ESM interop, as in groundForeground.test.js: @babel/traverse's default export sometimes
// lands wrapped an extra level deep depending on which module system loaded it first.
const traverse = _traverse.default ?? _traverse;

// Mechanism for DESIGN.md section 3's type scale: "The steps in use are 10, 11, 12, 13, 14, 17,
// 20, 22, 32, 76. Anything else is off the scale."
//
// It exists because that section was unenforceable, and unenforceability is not theoretical here.
// The collection member-order plate shipped at 9px, survived a critique that named it the clearest
// finding of its run, survived the provenance check that closed that finding ("the comp declares
// it, so the code is right" — which answered whose fault it was and dropped whether 9 was
// correct), and was finally moved to 10 with the whole suite green on both sides of the change.
// 1111 tests could not see it. Same family as fonts.test.js, groundForeground.test.js and the
// mono split: a rule in the document with nothing able to report on it.
//
// Note the direction of the current risk. 9px has now been REMOVED from section 3, which leaves
// the scale more exposed rather than less: the document no longer sanctions it, and without this
// file nothing in the codebase would notice a 9 coming back.

// DESIGN.md section 3. Sorted for the failure message only; membership is what matters.
const SCALE = [10, 11, 12, 13, 14, 17, 20, 22, 32, 76];

// Tailwind's named sizes, resolved to the pixels they actually render.
//
// THIS TABLE IS TRUE BY INHERITANCE, NOT BY DECLARATION, which is why the theme assertion below
// exists and is not optional. `src/index.css`'s `@theme inline` block declares colours, both font
// families and `--spacing`, and no `--text-*` at all — so these are Tailwind 4's defaults reaching
// this project untouched. Declare `--text-sm: 15px` there and this table silently becomes wrong
// about 47 call sites while every assertion here keeps passing. The guard would go on being green
// and would be lying, which is the exact failure it was written to prevent, reproduced one level
// down. The theme assertion is what keeps the table honest: the day an override appears, this file
// fails and says to derive these instead of hardcoding them.
const NAMED_PX = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};

// Two shapes of false positive, both found by running this against the real codebase rather than
// reasoning about it:
//
// - Hyphens are part of the token. `text-cover-body` is one colour utility, and a pattern stopping
//   at the first hyphen reads it as an unknown size called "cover" — five real lines of
//   ItemDetail.jsx on the first run.
// - `\b` is not a left edge here. In `[-webkit-text-stroke:2px_var(--ink)]` — IndexLetter's
//   arbitrary CSS property, the construction the whole index letter depends on — a word boundary
//   sits between the hyphen and `text`, so a `\btext-` pattern matches inside it. The lookbehind
//   requires the utility to actually START, rather than merely to appear.
const TEXT_UTILITY = /(?<![\w-])text-([a-z0-9][a-z0-9-]*|\[\d+px\])/g;

// Tailwind colour utilities share the `text-` prefix with the size utilities, so the scan has to
// know which tokens are colours or it will read `text-ink` as an unknown size. This list is the
// palette from DESIGN.md section 2 plus the keywords the codebase uses.
const COLOUR_TOKENS = new Set([
  'paper',
  'paper-deep',
  'ink',
  'ink-soft',
  'imprint',
  'out',
  'shared',
  'cover-body',
  'cover-soft',
  'cover-rule',
  'current',
  'transparent',
  'inherit',
]);

// Non-size, non-colour `text-` utilities: alignment, wrapping, overflow.
const NON_SIZE_UTILITIES = new Set([
  'left',
  'center',
  'right',
  'justify',
  'start',
  'end',
  'wrap',
  'nowrap',
  'balance',
  'pretty',
  'clip',
  'ellipsis',
]);

// The one deliberate exception, and it is platform behaviour rather than a typographic choice.
// Mobile Safari zooms the page when a focused input's font-size is under 16px, which on a
// phone-first PWA jerks the viewport on every tap into a field. `Field.jsx` sets `text-base` on
// its input, select and textarea for that reason and must keep doing so.
//
// Scoped to that one file rather than to a count. Pinning "three occurrences" would break the
// moment a fourth legitimate control is added, and pinning nothing would let 16px spread quietly
// through the app; the file is the real boundary, because Field.jsx is where form controls are
// built. 16px anywhere else is a violation.
//
// Recorded because the honest version of this is worth more than a tidy one: the reason above was
// NOT found in a comment. Field.jsx documents almost every other decision it makes — the reveal's
// component-only state, `type="button"` on the reveal so it cannot submit the form, the number
// spinner and resize-grabber suppressions, why `outline-none` is absent — and the three
// `text-base` sites carried nothing. The value is correct and had been surviving on nobody's
// knowledge since it was typed, which is a worse condition than a badly-filed exception, not a
// better one. It is written down here and in DESIGN.md section 3 so the next reader who finds 16
// off the scale does not "fix" it.
// AN INPUT, not a file. This was `{ file: 'components/imprint/Field.jsx', px: 16 }`, and scoping
// it to a file is what let the defect through: `SearchField`'s input sat at 13px — on the scale,
// so the guard passed it — while being the one control in the app that actually zooms, and the
// most-tapped one in the product. Reported from the deployed app, not by any check.
//
// The exception was always about INPUTS. Recording it as a location meant the second input could
// not inherit the reason, only the first could keep it. Matched on the JSX element now, so a
// third input is covered without registration and 16px on a paragraph is still a violation.
const INPUT_ZOOM_PX = 16;
const ZOOMABLE_ELEMENTS = new Set(['input', 'select', 'textarea']);

// A form control reached through a VARIABLE tag still takes keyboard input. `Field` renders
// `<Tag>` where `Tag` resolves from its `as` prop to input, select or textarea — so a rule
// matching only lowercase literals would have excluded the very component the exception was
// written for, which is how the first attempt at this fix failed.
//
// Collected per file: any identifier assigned one of those tag names somewhere in the module.
// Deliberately loose in one direction and tight in the other — it admits a variable that could be
// a form control, and still rejects 16px on a paragraph, which is the thing being guarded.
const formControlIdentifiers = (ast) => {
  const names = new Set();

  // Pass 1: any name given a form-control tag directly. `Field`'s is a DEFAULT PARAMETER —
  // `({ as = 'input' })` — not an assignment, which is what the first two attempts at this
  // detector missed: they looked where the value is used rather than where it is introduced.
  traverse(ast, {
    AssignmentPattern(nodePath) {
      const { left, right } = nodePath.node;
      if (left.type === 'Identifier' && right.type === 'StringLiteral' && ZOOMABLE_ELEMENTS.has(right.value)) {
        names.add(left.name);
      }
    },
    VariableDeclarator(nodePath) {
      const { id, init } = nodePath.node;
      if (id.type === 'Identifier' && init?.type === 'StringLiteral' && ZOOMABLE_ELEMENTS.has(init.value)) {
        names.add(id.name);
      }
    },
  });

  // Pass 2: one level of aliasing, which is exactly `const Tag = as`. Deliberately ONE level —
  // an unbounded resolver would start admitting anything, and the point of this exception is to
  // stay narrow enough that 16px on a paragraph is still a violation.
  traverse(ast, {
    VariableDeclarator(nodePath) {
      const { id, init } = nodePath.node;
      if (id.type === 'Identifier' && init?.type === 'Identifier' && names.has(init.name)) {
        names.add(id.name);
      }
    },
  });

  return names;
};

const SRC_DIR = path.resolve(process.cwd(), 'src');
const INDEX_CSS = path.resolve(process.cwd(), 'src/index.css');

// SCOPE, stated rather than left to be inferred — an unnamed boundary reads as complete coverage.
//
// Scanned: the `className` values of every non-test `.jsx` file under `src/`. Class strings live
// only in `.jsx` in this codebase (verified: no `.js` file under `src/` carries a size utility),
// so scanning `.js` would add nothing but reach.
//
// NOT scanned: `scripts/` and `tools/` (harness code, whose class strings are assertions ABOUT the
// app rather than styling of it), and `docs/ui-design/ui-v3-mockup.html` (the comp — a design
// artefact that is law for three screens, owned by the design session).
//
// And it reads `className` values via the AST rather than the raw file, which is not fussiness:
// the first version of this guard scanned whole-file source and flagged `text-transform` inside a
// PROSE COMMENT in ItemDetail.jsx explaining what `caps` sets. A guard that reads comments is
// answering a true question about the wrong substrate, which is this project's most-repeated
// failure and not one worth reproducing in the thing built to prevent it.
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

// The raw source slice of the attribute value, not an evaluation of it — `cn(...)` calls,
// ternaries and template literals all stay searchable as one string, exactly as groundForeground
// treats them.
const classNameValues = (code) => {
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  const tagVariables = formControlIdentifiers(ast);
  const values = [];
  traverse(ast, {
    JSXAttribute(nodePath) {
      const attr = nodePath.node;
      if (attr.name?.name !== 'className' || !attr.value) return;
      values.push({
        source: code.slice(attr.value.start, attr.value.end),
        line: attr.value.loc.start.line,
        // Whether the owning element takes keyboard input, so the input-zoom exception can be
        // about inputs rather than about whichever file happened to need it first.
        isFormControl:
          ZOOMABLE_ELEMENTS.has(nodePath.parent?.name?.name) ||
          tagVariables.has(nodePath.parent?.name?.name),
      });
    },
  });
  return values;
};

const findViolations = (file) => {
  const code = fs.readFileSync(file, 'utf8');
  const relative = path.relative(SRC_DIR, file);
  const violations = [];

  for (const { source, line, isFormControl } of classNameValues(code)) {
    for (const match of source.matchAll(TEXT_UTILITY)) {
      const token = match[1];
      if (COLOUR_TOKENS.has(token) || NON_SIZE_UTILITIES.has(token)) continue;

      const arbitrary = token.match(/^\[(\d+)px\]$/);
      const px = arbitrary ? Number(arbitrary[1]) : NAMED_PX[token];

      if (px === undefined) {
        // A named size this table does not know is a FAILURE, not a skip. Silently ignoring one
        // would reintroduce the blind spot in miniature: the guard would report clean on a size
        // it could not read, which is indistinguishable from a size that passed.
        violations.push(
          `${relative}:${line} — \`${match[0]}\` is a \`text-\` utility this guard cannot ` +
            'resolve. If it is a size, add it to NAMED_PX with its real rendered value; if it is ' +
            'a colour or another utility, add it to the sets above. Do not let it pass unread',
        );
        continue;
      }

      if (SCALE.includes(px)) continue;
      if (px === INPUT_ZOOM_PX && isFormControl) continue;

      violations.push(
        `${relative}:${line} — \`${match[0]}\` resolves to ${px}px, which is off DESIGN.md ` +
          `section 3's scale (${SCALE.join(', ')})`,
      );
    }
  }

  return violations;
};

describe('type scale (DESIGN.md section 3)', () => {
  const files = listSourceFiles(SRC_DIR);

  it('found source files to check', () => {
    // A check that silently scans nothing is worse than no check.
    expect(files.length).toBeGreaterThan(20);
  });

  it('resolves Tailwind\'s named sizes, not only the arbitrary ones', () => {
    // The scope trap this guard was nearly built into. Of the app's size classes, roughly 70 are
    // named (`text-sm` and friends) and 44 are arbitrary (`text-[11px]`). A guard matching only
    // the arbitrary form would cover 44, miss 70, and report clean — the CLI detector's own
    // Tailwind blindness, reproduced by us and indistinguishable from a guard that works.
    //
    // Asserted on the resolver itself so the coverage is a fact rather than a hope: this fails if
    // anyone later "simplifies" findViolations down to the arbitrary pattern.
    // Written to the OS temp dir, NOT into `src/`. A probe file inside the scanned tree is read
    // by every OTHER guard that walks `src/` — groundForeground, monoText, routeLandmarks — and
    // vitest runs those files in parallel workers, so one of them could list the directory while
    // the probe existed and read it after this test's `finally` deleted it. That produced an
    // intermittent `ENOENT: ... __type-scale-probe.jsx` in whichever guard happened to be
    // mid-walk: a failure with no relationship to the change under test, in a file nobody had
    // touched. `findViolations` takes an absolute path and only uses SRC_DIR for the label, so
    // nothing about what is asserted changes.
    const probe = path.join(os.tmpdir(), 'alexandria-type-scale-probe.jsx');
    // `text-lg` is 18px — off the scale, and completely invisible to a class-literal scan.
    fs.writeFileSync(probe, 'const X = () => <p className="text-lg" />;\nexport default X;\n');
    try {
      const violations = findViolations(probe);
      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatch(/text-lg.*18px/);
    } finally {
      fs.unlinkSync(probe);
    }
  });

  it('still rejects 16px on something that is not a form control', () => {
    // The exception widened from a file to a concept, and a widened exception has to be shown to
    // still exclude. 16px is the input-zoom floor, not a licence — a paragraph at `text-base` is
    // off the scale and must say so.
    const probe = path.join(os.tmpdir(), 'alexandria-zoom-probe.jsx');
    fs.writeFileSync(probe, 'const X = () => <p className="text-base">not an input</p>;\nexport default X;\n');
    try {
      const violations = findViolations(probe);
      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatch(/text-base.*16px/);
    } finally {
      fs.unlinkSync(probe);
    }
  });

  it('accepts 16px on an input reached through a variable tag, as Field renders one', () => {
    const probe = path.join(os.tmpdir(), 'alexandria-zoom-tag-probe.jsx');
    fs.writeFileSync(
      probe,
      "const F = ({ as = 'input' }) => { const Tag = as; return <Tag className=\"text-base\" />; };\nexport default F;\n",
    );
    try {
      expect(findViolations(probe)).toEqual([]);
    } finally {
      fs.unlinkSync(probe);
    }
  });

  it('declares no `--text-*` override, so the named-size table stays true by construction', () => {
    // The table above is Tailwind's defaults reaching this project untouched. That is an
    // inheritance, not a declaration, and an inheritance can be revoked silently. If this ever
    // fails, the fix is NOT to delete this assertion: it is to derive NAMED_PX from the declared
    // values, because from that moment the hardcoded table is wrong about every named size in the
    // app while every other assertion here keeps passing.
    const css = fs.readFileSync(INDEX_CSS, 'utf8');
    expect(css).not.toMatch(/--text-[\w-]+\s*:/);
  });

  it('sets every font size on the scale, with the one recorded input-zoom exception', () => {
    const violations = files.flatMap(findViolations);
    expect(violations).toEqual([]);
  });
});
