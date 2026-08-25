#!/usr/bin/env node
// Deterministic screenshots for design review. Accepts a file:// comp and an http:// dev
// server through the same command, so reproduction is one workflow rather than two.
//
// Determinism matters more than convenience here: without a fixed device scale, settled
// fonts, and motion forced off, two runs of the same page differ and the comparison is noise.
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { startFixtureServer, stopFixtureServer } from './fixture-server.mjs';

const VIEWPORTS = {
  // 390 is the comp's own frame width, so crops line up against it without scaling.
  phone: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 900 },
};

const DEFAULT_OUT = {
  phone: '.impeccable/review/mobile.png',
  tablet: '.impeccable/review/tablet.png',
  desktop: '.impeccable/review/desktop.png',
};

// puppeteer-core ships no browser. Resolve the real Chrome, and fail loudly rather than
// falling back to a different engine — comparing against a different renderer is worse than
// not comparing at all.
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const resolveChrome = () => {
  const candidate = process.env.CHROME_PATH || MAC_CHROME;
  if (fs.existsSync(candidate)) return candidate;
  throw new Error(
    `No Chrome found at ${candidate}. Set CHROME_PATH to a Chrome or Chromium executable.`,
  );
};

const USAGE = [
  'Usage: yarn shoot --target <file://…|http://…> [options]',
  '',
  '  --viewport  phone | tablet | desktop | WxH   (default: phone)',
  '  --out       output path                      (default: .impeccable/review/<name>.png)',
  '  --full      capture the full scrollable page',
  '  --clip      CSS selector; capture only that element',
  '  --wait      CSS selector to await before capturing',
  '  --scale     device pixel ratio               (default: 2)',
  '  --serve     start a fixture server on a private port and shoot a PATH target,',
  '              stopping it afterwards. Removes all manual server juggling — and with',
  '              it the orphaned-port problem that juggling kept creating.',
].join('\n');

const parseArgs = (argv) => {
  const args = { viewport: 'phone', scale: 2, full: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--full') args.full = true;
    else if (flag === '--target') args.target = argv[++i];
    else if (flag === '--viewport') args.viewport = argv[++i];
    else if (flag === '--out') args.out = argv[++i];
    else if (flag === '--clip') args.clip = argv[++i];
    else if (flag === '--wait') args.wait = argv[++i];
    else if (flag === '--scale') args.scale = Number(argv[++i]);
    else if (flag === '--serve') args.serve = true;
    else throw new Error(`Unknown flag ${flag}\n\n${USAGE}`);
  }
  if (!args.target) throw new Error(USAGE);
  return args;
};

const resolveViewport = (name) => {
  if (VIEWPORTS[name]) return VIEWPORTS[name];
  const match = /^(\d+)x(\d+)$/.exec(name);
  if (!match) throw new Error(`Unknown viewport ${name}. Use phone, tablet, desktop, or WxH.`);
  return { width: Number(match[1]), height: Number(match[2]) };
};

const args = parseArgs(process.argv.slice(2));
const viewport = resolveViewport(args.viewport);
const out = path.resolve(args.out ?? DEFAULT_OUT[args.viewport] ?? 'shot.png');

// With --serve the target is a PATH, and the server it is shot against is started and stopped
// here. Every orphaned port in this project came from starting one by hand in a shell.
const SERVE_PORT = Number(process.env.SHOOT_PORT ?? 5190);
const server = args.serve
  ? await startFixtureServer({ port: SERVE_PORT, readyPath: args.target })
  : null;
const target = args.serve ? `http://localhost:${SERVE_PORT}${args.target}` : args.target;

const browser = await puppeteer.launch({
  executablePath: resolveChrome(),
  headless: true,
  args: ['--force-color-profile=srgb', '--hide-scrollbars'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ ...viewport, deviceScaleFactor: args.scale });
  // Motion off at the engine level, so no transition is ever caught mid-flight.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  await page.goto(target, { waitUntil: 'networkidle0', timeout: 60_000 });
  if (args.wait) await page.waitForSelector(args.wait, { timeout: 30_000 });
  // Webfonts swap late; capturing before they settle compares two different typefaces.
  await page.evaluate(() => document.fonts.ready);

  fs.mkdirSync(path.dirname(out), { recursive: true });

  // Element clipping is what makes a region-by-region review possible: a single full-page
  // thumbnail hides exactly the failures worth finding.
  const shotTarget = args.clip ? await page.$(args.clip) : page;
  if (args.clip && !shotTarget) throw new Error(`No element matches ${args.clip}`);
  await shotTarget.screenshot({ path: out, fullPage: args.clip ? undefined : args.full });

  console.log(`${out}  ${args.viewport} @${args.scale}x${args.full ? ' full-page' : ''}`);
} finally {
  await browser.close();
  if (server) await stopFixtureServer(server);
}
