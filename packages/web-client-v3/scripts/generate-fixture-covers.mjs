#!/usr/bin/env node
// Generates the tiny placeholder "cover art" used by the fixtures — solid-colour rectangles
// standing in for a book cover or film poster, portrait 2:3 at 132x198 (the item-detail hero's
// own frame size; the browser's `object-cover` scales them down cleanly for the 48x72 row frame
// too, so one asset size serves both, per the frame's "one ratio for every item" rule).
//
// These are CONTENT — fixture book/film artwork, standing in for what Google Books/TMDB would
// actually return — not UI. They deliberately do NOT reuse the app's palette tokens: the
// palette law ("each colour has exactly one job") governs the interface, not a fictional book
// jacket, the same way a real cover photo is not subject to it.
//
// Run once; the output (tools/fixture-covers/*.webp) is committed. Re-run only if this palette
// changes — this script is not part of any build or test step, so a stale committed file next to
// an edited script here would be a real drift, not a hypothetical one.
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../tools/fixture-covers');

const WIDTH = 132;
const HEIGHT = 198;
const BAND_TOP = 26;
const BAND_HEIGHT = 44;

// Six variants is enough to make a stream look like a shelf of different books rather than one
// swatch repeated — this is a fixture, not an asset library, so it stops there.
const COVERS = [
  { name: 'cover-1', base: '#4a5a73', band: '#8aa0bf' },
  { name: 'cover-2', base: '#7a2e2e', band: '#c97b7b' },
  { name: 'cover-3', base: '#2f5233', band: '#7fae86' },
  { name: 'cover-4', base: '#8a6e2f', band: '#d9bb6e' },
  { name: 'cover-5', base: '#5b3b5c', band: '#b98bbc' },
  { name: 'cover-6', base: '#2e6e6e', band: '#7fc2c2' },
];

const svg = ({ base, band }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${base}" />
  <rect y="${BAND_TOP}" width="${WIDTH}" height="${BAND_HEIGHT}" fill="${band}" />
</svg>`;

for (const cover of COVERS) {
  const outPath = path.join(OUT_DIR, `${cover.name}.webp`);
  // eslint-disable-next-line no-await-in-loop -- sequential, one-off generation script
  await sharp(Buffer.from(svg(cover))).webp({ quality: 60 }).toFile(outPath);
  // eslint-disable-next-line no-console
  console.log(`wrote ${outPath}`);
}
