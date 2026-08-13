// Downloads Archivo and Chivo Mono (both OFL) as variable woff2, subset by Google's own
// Latin + Latin Extended-A unicode-range. Run once; the woff2 files are committed, because a
// build must not depend on fonts.googleapis.com being reachable.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/fonts');

// A modern UA string is required: Google serves woff2 only to browsers it recognises.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FACES = [
  {
    file: 'archivo-var.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap',
  },
  {
    file: 'chivo-mono-var.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Chivo+Mono:wght@400..700&display=swap',
  },
];

// Google emits one @font-face per unicode-range. We want the latin-ext cut, which covers
// French diacritics and the OE / AE ligatures the index alphabet depends on.
const pickLatinExtUrl = (css) => {
  const blocks = css.split('@font-face').filter((b) => b.includes('unicode-range'));
  const latinExt = blocks.find((b) => b.includes('U+0100')) ?? blocks[blocks.length - 1];
  return latinExt.match(/url\((https:[^)]+\.woff2)\)/)[1];
};

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const face of FACES) {
  const css = await fetch(face.css, { headers: { 'User-Agent': UA } }).then((r) => r.text());
  const url = pickLatinExtUrl(css);
  const bytes = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  fs.writeFileSync(path.join(OUT_DIR, face.file), bytes);
  console.log(`${face.file}  ${(bytes.length / 1024).toFixed(1)} kB  <- ${url}`);
}
