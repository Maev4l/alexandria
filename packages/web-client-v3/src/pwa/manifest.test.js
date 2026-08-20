import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// The manifest is declared in `vite.config.js` and only becomes a file in a build, so
// `check:browser` — which runs against the dev server — cannot see it. This reads the config's
// source, which is the thing a reviewer would otherwise have to remember to check by hand.
const config = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.js'), 'utf8');
// The icon set is declared once in `tools/pwa-icons.js` and read by the generator, the Vite
// manifest and the browser check alike, so the manifest cannot advertise a file nobody emits.
// This reads it there rather than in the config, because that is where the fact lives.
const iconSet = fs.readFileSync(path.resolve(process.cwd(), 'tools/pwa-icons.js'), 'utf8');

describe('the PWA manifest', () => {
  it('paints the imprint\'s own colours, not a framework default', () => {
    // theme_color paints the platform's chrome; background_color is the cold-start ground.
    expect(config).toMatch(/theme_color:\s*'#0B0B0B'/);
    expect(config).toMatch(/background_color:\s*'#F6F6F3'/);
  });

  it('declares a maskable icon, which Android crops to its own shape', () => {
    expect(iconSet).toMatch(/manifestPurpose:\s*'maskable'/);
    // And no image declares both jobs at once, which would force the same pixels into a masked
    // crop and an unmasked tile — the reason three distinct sources exist at all.
    //
    // Matched on the DECLARED PROPERTY, not on the string anywhere in the file: the first draft
    // was `/'any maskable'/`, which fired on the comment that explains why the value is not used.
    // That is the shape this project has paid for before, and the rule it settled on is to make
    // the detector precise rather than reword a correct comment out of a checker's way.
    expect(iconSet).not.toMatch(/manifestPurpose:\s*'any maskable'/);
  });

  // THE ABSENCE IS THE ASSERTION. `orientation: 'portrait'` was specified by the plan and would
  // HARD-LOCK rotation on an installed Android app — a tablet held in landscape could not display
  // the app at all. PRODUCT.md requires tablet and desktop to be "sane and usable", DESIGN.md §4's
  // 448px column exists precisely so a wide viewport is not a stretched phone, and the capture
  // screen's no-scroll ruling was measured at 667x390 with landscape scrolling accepted on the
  // record. A lock contradicts all three.
  //
  // "Nothing has a landscape layout to rotate into" is an argument for not BUILDING one, not for
  // preventing rotation. Asserted as an absence because a positive test cannot detect a setting
  // that should not be there — the manifest would look correct with it.
  it('locks no orientation, so a tablet in landscape still works', () => {
    expect(config).not.toMatch(/orientation:\s*'(portrait|landscape)/);
  });
});
