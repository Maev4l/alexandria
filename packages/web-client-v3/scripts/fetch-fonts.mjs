// Downloads Archivo and Chivo Mono (both OFL) as variable woff2, self-hosted.
//
// Google serves each family as SEVERAL @font-face blocks, one per unicode-range cut
// (vietnamese / latin-ext / latin), never as one file covering everything. An earlier version
// of this script picked "the block containing U+0100" on the assumption that latin-ext is a
// superset of latin — it is not, they are disjoint files — so we shipped only the extended
// half: no plain ASCII, no lowercase Latin letters, nothing outside the accented range. The
// product rendered in system-ui for every character except a stray 'A' and space.
//
// Fix: fetch BOTH the "latin" and "latin-ext" blocks (identified by Google's own comment
// marker, not by guessing which ranges they contain) for each family, so both files travel
// together. "vietnamese" is fetched by neither this script nor declared in index.css: it is
// additive glyph coverage this product's content (English + French) does not need.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/fonts');

// A modern UA string is required: Google serves woff2 only to browsers it recognises.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FAMILIES = [
  {
    family: 'Archivo',
    filePrefix: 'archivo-var',
    css: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap',
  },
  {
    family: 'Chivo Mono',
    filePrefix: 'chivo-mono-var',
    css: 'https://fonts.googleapis.com/css2?family=Chivo+Mono:wght@400..700&display=swap',
  },
];

// The two cuts this product ships. Google marks each @font-face with a leading comment
// (`/* latin */`, `/* latin-ext */`, `/* vietnamese */`) — keying off that marker is exact,
// unlike keying off which codepoints happen to appear in the range.
const CUTS = ['latin', 'latin-ext'];

// Split Google's CSS on its own comment markers so each block carries its cut name, its
// woff2 URL and its verbatim unicode-range together — the three travel as one unit from here
// through to index.css, which is the whole fix: a file shipped under a face with no
// unicode-range is what let a range-specific file silently stand in for everything.
const parseBlocks = (css) => {
  const parts = css.split(/\/\*\s*([\w-]+)\s*\*\//).slice(1); // [name, block, name, block, ...]
  const blocks = [];
  for (let i = 0; i < parts.length; i += 2) {
    const name = parts[i];
    const block = parts[i + 1];
    const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const unicodeRange = block.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    if (url && unicodeRange) blocks.push({ name, url, unicodeRange });
  }
  return blocks;
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const generated = [];

for (const { family, filePrefix, css: cssUrl } of FAMILIES) {
  const css = await fetch(cssUrl, { headers: { 'User-Agent': UA } }).then((r) => r.text());
  const blocks = parseBlocks(css);

  for (const cut of CUTS) {
    const block = blocks.find((b) => b.name === cut);
    if (!block) {
      throw new Error(`fetch-fonts: Google's CSS for "${family}" has no "${cut}" cut anymore`);
    }
    const file = `${filePrefix}-${cut}.woff2`;
    const bytes = Buffer.from(await fetch(block.url).then((r) => r.arrayBuffer()));
    fs.writeFileSync(path.join(OUT_DIR, file), bytes);
    console.log(`${file}  ${(bytes.length / 1024).toFixed(1)} kB  <- ${block.url}`);
    generated.push({ family, file, unicodeRange: block.unicodeRange });
  }
}

// Printed so the @font-face unicode-range in index.css can be pasted verbatim rather than
// retyped — retyping a 200-character range by hand is exactly how a transcription slip would
// reintroduce this bug's own failure mode one property at a time.
console.log('\n--- unicode-range values for src/index.css (copy verbatim) ---');
for (const { family, file, unicodeRange } of generated) {
  console.log(`\n/* ${family} — ${file} */\nunicode-range: ${unicodeRange};`);
}
