// The rasterised PWA icon set, declared once.
//
// Three consumers read this list and none of them may hold its own copy: `scripts/
// generate-icons.mjs` emits exactly these files, `vite.config.js` builds the web app manifest
// from them, and `scripts/check-browser.mjs` loads every one of them in a real browser and
// measures that it decoded. Retyping the list in any of the three is how a manifest comes to
// advertise an icon nobody generates - which serves a 404 the platform reports nowhere.
//
// THREE SOURCES, NOT ONE, and they are not interchangeable. `icon-source-favicon.svg` drops the
// index rule because at 16px the 32/512 gap between the letter and its rule is one pixel and the
// two merge; `icon-source-maskable.svg` insets the mark into the 80% safe circle. Collapsing
// them to a single source would either blur the small sizes or let a circular mask crop the
// rule. Each file's own comment carries the measurement.

// Relative to `public/`, which is also their URL path from the site root.
export const ICON_SOURCES = {
  standard: 'icon-source.svg',
  favicon: 'icon-source-favicon.svg',
  maskable: 'icon-source-maskable.svg',
};

// `manifestPurpose: null` means the file is real and checked but is not a web-app-manifest icon:
// the Apple touch icon is declared by a <link> in index.html, because iOS does not read the
// manifest's icon list for the home-screen mark.
export const RASTER_ICONS = [
  { file: 'icons/favicon-16.png', size: 16, source: 'favicon', manifestPurpose: null },
  { file: 'icons/favicon-32.png', size: 32, source: 'favicon', manifestPurpose: null },
  { file: 'icons/logo180.png', size: 180, source: 'standard', manifestPurpose: null },
  { file: 'icons/logo192.png', size: 192, source: 'standard', manifestPurpose: 'any' },
  { file: 'icons/logo512.png', size: 512, source: 'standard', manifestPurpose: 'any' },
  // Its own file rather than a second `purpose` on logo512: a platform that crops to a circle
  // must get the inset mark, and a platform that does not must get the full-bleed one. Declaring
  // `purpose: 'any maskable'` on one image forces the same pixels into both jobs.
  { file: 'icons/logo512-maskable.png', size: 512, source: 'maskable', manifestPurpose: 'maskable' },
];

// At the site root, not under `icons/`, because browsers request `/favicon.ico` by path with no
// <link> involved - a legacy default that produces a 404 on every cold load if the file is
// filed anywhere else. Built from the 16 and 32 rasters above (an ICO is a container of them).
export const FAVICON_ICO = { file: 'favicon.ico', sizes: [16, 32], source: 'favicon' };

export const MANIFEST_ICONS = RASTER_ICONS.filter((icon) => icon.manifestPurpose).map((icon) => ({
  src: `/${icon.file}`,
  sizes: `${icon.size}x${icon.size}`,
  type: 'image/png',
  purpose: icon.manifestPurpose,
}));
