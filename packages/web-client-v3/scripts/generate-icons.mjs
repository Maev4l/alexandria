#!/usr/bin/env node
// Rasterises the PWA icon set from the three COMMITTED SVG sources in `public/`.
//
// Usage: yarn --cwd packages/web-client-v3 icons
//
// This script draws nothing. It reads `icon-source.svg`, `icon-source-favicon.svg` and
// `icon-source-maskable.svg` and resizes them; the artwork lives in those files, under review,
// in a diffable form, with its measurements recorded in its own comments. A generator that
// synthesised its own geometry would put the mark in a place nobody looks at when they change
// the design.
//
// NO <text> ELEMENT IS ADDED TO ANY SOURCE, and none of them contains one. An SVG `<text>`
// rasterises through fontconfig, which substitutes a face SILENTLY when the named one is absent
// — so an icon built on a machine without Archivo would ship a system-font letterform and
// nothing would report it. That is the exact mechanism that hid a total font failure in this
// project for three slices (DESIGN.md §3): the comp fell back too, so both sides were wrong
// identically and matching was mistaken for correct. The sources hand-author the letterform as
// geometry, which has no such dependency and is identical on every machine.
//
// THE SIZES ARE NOT RESAMPLED FROM A 512 RASTER. Each output is rendered from the vector at its
// own size, by scaling the rasteriser's density, so a 16px favicon is drawn at 16px rather than
// downsampled from 512 — which is what keeps the letter's counter open at the smallest size the
// mark ever appears at.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { RASTER_ICONS, FAVICON_ICO, ICON_SOURCES } from '../tools/pwa-icons.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');

// The sources declare `width="512"`, and sharp's default density of 72dpi renders an SVG at its
// declared size. Scaling the density in proportion renders it natively at the target instead.
const SOURCE_SIZE = 512;
const BASE_DENSITY = 72;

// DESIGN.md §2. Asserted below on every emitted file, not assumed: these two are the whole mark.
const INK = { r: 0x0b, g: 0x0b, b: 0x0b };
const IMPRINT = { r: 0xf2, g: 0xc2, b: 0x00 };

const readSource = (name) => {
  const file = path.join(PUBLIC_DIR, name);
  if (!fs.existsSync(file)) {
    throw new Error(`generate-icons: missing committed source ${file}. This script rasterises the
sources in public/; it does not draw its own.`);
  }
  return fs.readFileSync(file);
};

const sources = Object.fromEntries(
  Object.entries(ICON_SOURCES).map(([key, file]) => [key, readSource(file)]),
);

const rasterise = async (sourceKey, size) =>
  sharp(sources[sourceKey], { density: (BASE_DENSITY * size) / SOURCE_SIZE })
    // Rendering at a scaled density lands within a pixel of the target; the resize pins it
    // exactly, so a manifest entry that says 192x192 is true of the bytes and not merely of the
    // intent. It is a no-op in the ordinary case.
    .resize(size, size, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toBuffer();

// A blank raster is the specific failure this whole task is written around: it writes a
// well-formed PNG, serves 200, decodes without error, and shows nothing. Every check that reads
// a listing, a manifest or an accessibility tree agrees it is fine. So each buffer is decoded
// back to raw pixels here and asked whether both of the mark's two colours are actually present.
//
// The floors are low on purpose — at 16px the letter is a handful of pixels and the rest is
// antialiasing. This asserts that the mark is there, not that it is well composed.
const MIN_IMPRINT_SHARE = 0.02;
const MIN_INK_SHARE = 0.2;

const inspect = async (buffer) => {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const near = (r, g, b, target, tolerance) =>
    Math.abs(r - target.r) <= tolerance &&
    Math.abs(g - target.g) <= tolerance &&
    Math.abs(b - target.b) <= tolerance;

  let ink = 0;
  let imprint = 0;
  const total = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (near(r, g, b, INK, 24)) ink += 1;
    else if (near(r, g, b, IMPRINT, 40)) imprint += 1;
  }
  return { width: info.width, height: info.height, inkShare: ink / total, imprintShare: imprint / total };
};

// An ICO is a container: a 6-byte header, one 16-byte directory entry per frame, then the frames
// themselves. Since Vista the frames may be whole PNG files, which every browser in this app's
// support range reads — so this packs the 16 and 32 rasters that were already generated above
// rather than re-encoding anything into BMP.
//
// sharp cannot write .ico, and the file is worth having anyway: browsers request `/favicon.ico`
// by path with no <link> tag involved, so its absence is a 404 on every cold load.
const buildIco = (frames) => {
  const HEADER_BYTES = 6;
  const ENTRY_BYTES = 16;
  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(frames.length, 4);

  let offset = HEADER_BYTES + ENTRY_BYTES * frames.length;
  const entries = frames.map(({ size, buffer }) => {
    const entry = Buffer.alloc(ENTRY_BYTES);
    // 0 means 256 in this field; every size here is well under that, but the encoding is why
    // the byte is written modulo 256 rather than asserted.
    entry.writeUInt8(size % 256, 0);
    entry.writeUInt8(size % 256, 1);
    entry.writeUInt8(0, 2); // palette size, 0 for truecolour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.buffer)]);
};

const write = (relativeFile, buffer) => {
  const file = path.join(PUBLIC_DIR, relativeFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buffer);
  return file;
};

const problems = [];
const rendered = new Map();

for (const { file, size, source } of RASTER_ICONS) {
  const buffer = await rasterise(source, size);
  const { width, height, inkShare, imprintShare } = await inspect(buffer);
  rendered.set(file, buffer);
  write(file, buffer);

  if (width !== size || height !== size) {
    problems.push(`${file}: rendered ${width}x${height}, expected ${size}x${size}`);
  }
  if (imprintShare < MIN_IMPRINT_SHARE || inkShare < MIN_INK_SHARE) {
    problems.push(
      `${file}: does not carry the mark — chrome yellow ${(imprintShare * 100).toFixed(1)}%, ` +
        `ink ${(inkShare * 100).toFixed(1)}%. A raster of one flat colour decodes perfectly ` +
        'and shows nothing.',
    );
  }

  console.log(
    `${file.padEnd(28)} ${String(size).padStart(3)}px  ${(buffer.length / 1024).toFixed(1).padStart(6)} kB  ` +
      `yellow ${(imprintShare * 100).toFixed(1)}%  ink ${(inkShare * 100).toFixed(1)}%  <- ${ICON_SOURCES[source]}`,
  );
}

// Reuses the buffers already generated and inspected above, so the .ico cannot contain frames
// that differ from the .png files of the same size.
const icoFrames = FAVICON_ICO.sizes.map((size) => {
  const entry = RASTER_ICONS.find((icon) => icon.size === size && icon.source === FAVICON_ICO.source);
  if (!entry) throw new Error(`generate-icons: no ${size}px ${FAVICON_ICO.source} raster to pack into the .ico`);
  return { size, buffer: rendered.get(entry.file) };
});
const ico = buildIco(icoFrames);
write(FAVICON_ICO.file, ico);
console.log(
  `${FAVICON_ICO.file.padEnd(28)} ${FAVICON_ICO.sizes.join('+')}px  ${(ico.length / 1024).toFixed(1).padStart(5)} kB  ` +
    `<- the ${FAVICON_ICO.sizes.join(' and ')} rasters above`,
);

if (problems.length > 0) {
  console.error(`\n${problems.length} icon(s) came out wrong:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`\n${RASTER_ICONS.length + 1} icons written to public/.`);
