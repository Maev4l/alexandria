import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './lib/contrast.js';

// Neither __dirname (the package is "type": "module") nor import.meta.url (Vitest rewrites it
// to an http:// URL under the jsdom transform) works here. Vitest runs with cwd at the package
// root, so resolve from there.
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');

const tokenValue = (name) => {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`token --${name} is not declared in index.css`);
  return match[1].trim();
};

const PALETTE = {
  paper: '#f6f6f3',
  'paper-deep': '#ecece7',
  ink: '#0b0b0b',
  'ink-soft': '#5a5a57',
  imprint: '#f2c200',
  out: '#d8412f',
  shared: '#0f6b4f',
  'cover-body': '#deded9',
  'cover-soft': '#b9b9b4',
  'cover-rule': '#3a3a38',
};

describe('token layer', () => {
  it.each(Object.entries(PALETTE))('declares --%s as %s', (name, value) => {
    expect(tokenValue(name).toLowerCase()).toBe(value);
  });

  it('declares the division scale', () => {
    expect(tokenValue('u')).toBe('4px');
    expect(tokenValue('d')).toBe('8px');
  });

  it('declares the four rule weights', () => {
    expect(tokenValue('rule-hair')).toBe('1px');
    expect(tokenValue('rule-frame')).toBe('2px');
    expect(tokenValue('rule-block')).toBe('3px');
    expect(tokenValue('rule-index')).toBe('4px');
  });
});

describe('contrast, as promised by DESIGN.md section 2', () => {
  const paper = PALETTE.paper;

  it('ink on paper clears AAA body text', () => {
    expect(contrastRatio(PALETTE.ink, paper)).toBeGreaterThanOrEqual(7);
  });

  it('ink-soft on paper clears AA body text', () => {
    expect(contrastRatio(PALETTE['ink-soft'], paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('ink on imprint clears AA body text, for plate caps', () => {
    expect(contrastRatio(PALETTE.ink, PALETTE.imprint)).toBeGreaterThanOrEqual(4.5);
  });

  it('shared on paper clears AA body text, for ribbons and tags', () => {
    expect(contrastRatio(PALETTE.shared, paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('out on paper clears only the large-text threshold, which is why it is edges-only', () => {
    const ratio = contrastRatio(PALETTE.out, paper);
    expect(ratio).toBeGreaterThanOrEqual(3);
    // Documents the restriction rather than merely describing it: if a future palette change
    // lifted --out above 4.5 this would fail, and the edges-only rule could then be revisited.
    expect(ratio).toBeLessThan(4.5);
  });

  it('paper on ink clears AAA, for the item-detail black cover', () => {
    expect(contrastRatio(paper, PALETTE.ink)).toBeGreaterThanOrEqual(7);
  });

  it('imprint on paper is far too low to describe a shape, which is why ink carries it', () => {
    // 1.55:1. This one number explains the whole system: yellow can only ever be a ground
    // with ink on it, or a fill inside an ink outline. It is why the plate has ink figures,
    // why the index letter is stroked in ink, and why a primary action sets its caps in ink.
    // An unstroked yellow glyph on paper would be a ghost, not a simplification.
    expect(contrastRatio(PALETTE.imprint, paper)).toBeLessThan(2);
  });
});

describe('the inverted surface, which cannot borrow the paper palette', () => {
  it('proves why: ink-soft on ink is unreadable, which is the reason the cover set exists', () => {
    expect(contrastRatio(PALETTE['ink-soft'], PALETTE.ink)).toBeLessThan(3);
  });

  it('cover-body clears AAA on ink, for the summary', () => {
    expect(contrastRatio(PALETTE['cover-body'], PALETTE.ink)).toBeGreaterThanOrEqual(7);
  });

  it('cover-soft clears AA on ink, for the plate line and loan durations', () => {
    expect(contrastRatio(PALETTE['cover-soft'], PALETTE.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('imprint clears AA on ink, for the title rule and the ledger head', () => {
    expect(contrastRatio(PALETTE.imprint, PALETTE.ink)).toBeGreaterThanOrEqual(4.5);
  });

  // Round 2 (item-detail hero): the design session wrote "~3.03:1" in their message and
  // "3.07:1" in the comp's own CSS comment, and said plainly both are computed rather than
  // measured — DESIGN.md §2's own table has been off by up to 0.7 before. Pinned here with a
  // tolerance so a future palette edit that drifts the true figure fails loudly instead of the
  // document quietly going stale again.
  it('shared on ink fails as text — ~3.03:1, which is why the cover puts it on an edge', () => {
    const ratio = contrastRatio(PALETTE.shared, PALETTE.ink);
    expect(ratio).toBeGreaterThan(2.9);
    expect(ratio).toBeLessThan(3.2);
    expect(ratio).toBeLessThan(4.5);
  });

  // Same shape as --out on --paper (§2's existing table): sound for a rule or an outline,
  // short of AA for small text, which is exactly the discipline the Overprint Stamp already
  // applies — colour on the outline, caps in a legible tone.
  it('out on ink fails as text too, for the same reason its stamp keeps caps off the colour', () => {
    const ratio = contrastRatio(PALETTE.out, PALETTE.ink);
    expect(ratio).toBeGreaterThan(3);
    expect(ratio).toBeLessThan(4.5);
  });
});

describe('the focus ring', () => {
  // THIS BLOCK USED TO PIN THE DEFECT. It asserted `outline: 3px solid var(--imprint)`, which was
  // faithfully what DESIGN.md said — and what DESIGN.md said was forbidden two sections earlier
  // by its own palette law: `--imprint` on `--paper` is ~1.55:1, and yellow cannot describe a
  // form at that ratio. An assertion inherits the correctness of the rule it encodes and adds
  // nothing to it, so this one defended a ring no reader could see.
  //
  // Focus is not the active state, which is what made yellow look right. `--imprint` marks what a
  // reader has chosen; focus marks where the KEYBOARD is, which is structure.
  it('is the structural tone, drawn as an outline and never a shadow', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--ink\)/);
    expect(css).not.toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--imprint\)/);
  });

  it('clears WCAG 2.2 SC 1.4.11 on paper, which the yellow ring missed by more than half', () => {
    // 3:1 is the floor for a focus indicator, and the old ring measured ~1.55:1. Measured from the
    // built stylesheet rather than asserted from the document, like every other figure here.
    expect(contrastRatio(PALETTE.ink, PALETTE.paper)).toBeGreaterThanOrEqual(3);
  });

  it('clears the same floor on a yellow ground, where the ring sits on the accent', () => {
    expect(contrastRatio(PALETTE.ink, PALETTE.imprint)).toBeGreaterThanOrEqual(3);
  });

  it('inverts on the black cover, where an ink ring would be invisible', () => {
    // The surface the old rule never covered: a yellow ring was legible on both grounds, so no
    // surface needed naming. An ink one is not, so the cover names itself.
    expect(css).toMatch(/\.cover\s+:focus-visible\s*\{[^}]*outline-color:\s*var\(--paper\)/);
    expect(contrastRatio(PALETTE.paper, PALETTE.ink)).toBeGreaterThanOrEqual(3);
  });
});

describe('the system refuses', () => {
  it('declares no border radius other than the zero that enforces its absence', () => {
    const declarations = css.match(/border-radius:\s*[^;]+;/g) ?? [];
    expect(declarations.filter((d) => !/border-radius:\s*0\s*;/.test(d))).toEqual([]);
    expect(css).not.toMatch(/--radius/);
  });

  it('declares no shadow', () => {
    expect(css).not.toMatch(/box-shadow\s*:/);
    expect(css).not.toMatch(/text-shadow\s*:/);
  });
});
