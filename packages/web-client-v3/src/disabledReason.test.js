import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { describe, expect, it } from 'vitest';

const traverse = _traverse.default ?? _traverse;

// DESIGN.md §6: a disabled primary renders as the ruled outline and fills to a plate the moment
// the form is valid — "becoming a filled plate the moment the form is valid is itself the
// affordance saying so". True, and it says NOTHING to a screen reader. `PlateButton`'s `reason`
// is the non-visual half: an `sr-only` sentence inside the button, which joins its accessible
// name (an `aria-describedby` was tried and removed — a disabled button is not focusable, so a
// description there is never announced on tab).
//
// THE MECHANISM WAS BUILT, TESTED, AND PASSED NOWHERE. `grep 'reason={'` returned zero
// non-test hits across the whole app while every form in it had exactly that control. This file
// exists because the fix for that is not "add it to the two screens someone noticed" — DESIGN.md
// records that a local patch to a system-wide gap is how the same defect returns on the next
// screen, and it has watched that happen four times.
//
// THE BOUNDARY, and it is the whole design of this check. A control disabled because something
// is MISSING owes the reader that fact. A control disabled because an operation is IN FLIGHT owes
// nothing extra: nothing is missing, and the label already narrates it ("Saving", "Looking it
// up"). So busy-only expressions are listed here, exhaustively, and anything else must carry a
// reason. A new busy flag fails this check rather than passing silently, which is deliberate: the
// author is then the one who decides which of the two kinds it is, at the moment they would know.
const BUSY_ONLY = new Set([
  'isBusy',
  'isAppending',
  'isClearing',
  'isDeleting',
  'isFetchingCover',
  'isReturning',
  'savingKey != null',
]);

const SRC_DIR = path.resolve(process.cwd(), 'src');

const listJsxFiles = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsxFiles(full));
    else if (entry.name.endsWith('.jsx') && !entry.name.endsWith('.test.jsx')) out.push(full);
  }
  return out;
};

// The `disabled` expression's own source text, split on `||` — the shape every call site in this
// codebase uses. A single term that is a known busy flag needs no reason; anything else does.
const findViolations = (file) => {
  const code = fs.readFileSync(file, 'utf8');
  const relative = `src/${path.relative(SRC_DIR, file).split(path.sep).join('/')}`;
  const violations = [];

  traverse(parse(code, { sourceType: 'module', plugins: ['jsx'] }), {
    JSXOpeningElement(nodePath) {
      const node = nodePath.node;
      if (node.name?.name !== 'PlateButton') return;
      const attrs = node.attributes.filter((a) => a.type === 'JSXAttribute');
      const disabled = attrs.find((a) => a.name.name === 'disabled');
      if (!disabled?.value || disabled.value.type !== 'JSXExpressionContainer') return;

      const expression = code.slice(disabled.value.expression.start, disabled.value.expression.end);
      const terms = expression.split('||').map((t) => t.trim());
      if (terms.every((term) => BUSY_ONLY.has(term))) return;

      if (!attrs.some((a) => a.name.name === 'reason')) {
        violations.push(
          `${relative}:${disabled.loc.start.line} — <PlateButton disabled={${expression}}> has no ` +
            '`reason`. It is disabled by something other than an in-flight operation, so a ' +
            'screen-reader user is told only that it is unavailable and never why. Add a ' +
            '`reason`, or — if this really is busy-only — add its flag to BUSY_ONLY above.',
        );
      }
    },
  });

  return violations;
};

describe('every disabled control that is WAITING ON THE READER says what it is waiting for', () => {
  const files = listJsxFiles(SRC_DIR);

  it('found source files to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('recognises a missing reason (so this check is not vacuous)', () => {
    // Proves the detector fires, rather than trusting that an empty violation list means the rule
    // holds — this project has caught four checks passing for the wrong reason.
    const probe = path.join(SRC_DIR, '..', 'node_modules', '.cache-disabled-reason-probe.jsx');
    fs.mkdirSync(path.dirname(probe), { recursive: true });
    fs.writeFileSync(probe, 'const X = () => <PlateButton disabled={!name.trim()}>Save</PlateButton>;\nexport default X;\n');
    try {
      expect(findViolations(probe)).toHaveLength(1);
    } finally {
      fs.unlinkSync(probe);
    }
  });

  it('accepts a busy-only control with no reason', () => {
    const probe = path.join(SRC_DIR, '..', 'node_modules', '.cache-disabled-busy-probe.jsx');
    fs.mkdirSync(path.dirname(probe), { recursive: true });
    fs.writeFileSync(probe, 'const X = () => <PlateButton disabled={isBusy}>Save</PlateButton>;\nexport default X;\n');
    try {
      // Nothing is missing and the label narrates the wait. Requiring a sentence here would be
      // the crying-wolf first act that gets a guard deleted rather than fixed.
      expect(findViolations(probe)).toHaveLength(0);
    } finally {
      fs.unlinkSync(probe);
    }
  });

  it('every input-gated control in the app carries its reason', () => {
    expect(files.flatMap(findViolations)).toEqual([]);
  });
});
