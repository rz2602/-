#!/usr/bin/env node
/**
 * Builds ONE self-contained HTML file that runs the game when opened directly
 * from disk (double-click), with no server and no other files.
 *
 *   1. `vite build --mode single` -> a single JS bundle in dist-single/
 *   2. The bundle, the Mishkontin frames (data URI), the frame manifest and
 *      the favicon are embedded into the HTML page.
 *
 * Output: release/mishkontin-v<version>.html
 * Usage:  npm run build:single
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_DIR = path.join(ROOT, 'dist-single');
const RELEASE_DIR = path.join(ROOT, 'release');
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

/** Assets the game loads, keyed exactly as in AssetPaths (src/config/constants.ts). */
const INLINE_ASSETS = {
  'assets/characters/mishkontin/generated/mishkontin-frames.json': 'json',
  'assets/characters/mishkontin/generated/mishkontin-frames.png': 'image/png',
};

execSync('npx vite build --mode single', { cwd: ROOT, stdio: 'inherit' });

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;

// Forest environment pieces are listed in their own manifest.
const FOREST_MANIFEST = 'assets/environments/forest/forest-assets.json';
INLINE_ASSETS[FOREST_MANIFEST] = 'json';
const forest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', FOREST_MANIFEST), 'utf8'));
for (const entry of Object.values(forest.assets)) INLINE_ASSETS[entry.path] = 'image/png';

const inline = {};
for (const [assetPath, type] of Object.entries(INLINE_ASSETS)) {
  const file = path.join(ROOT, 'public', assetPath);
  inline[assetPath] = type === 'json' ? JSON.parse(fs.readFileSync(file, 'utf8')) : dataUri(file, type);
}

let html = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf8');
const scriptTag = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!scriptTag) throw new Error('Could not find the module script tag in dist-single/index.html');
const bundle = fs
  .readFileSync(path.join(BUILD_DIR, scriptTag[1]), 'utf8')
  // Keep the inline script from being closed early by a literal "</script".
  .replace(/<\/script/gi, '<\\/script');

const assetsScript = `<script>window.__MISHKONTIN_INLINE_ASSETS__=${JSON.stringify(inline)};</script>`;
html = html
  .replace(scriptTag[0], '')
  .replace(/href="\.\/favicon\.png"/, `href="${dataUri(path.join(ROOT, 'public/favicon.png'), 'image/png')}"`)
  .replace('</body>', () => `${assetsScript}\n<script type="module">${bundle}</script>\n</body>`);

fs.mkdirSync(RELEASE_DIR, { recursive: true });
const out = path.join(RELEASE_DIR, `mishkontin-v${version.replace(/\.0$/, '')}.html`);
// Keep only the current release file.
for (const old of fs.readdirSync(RELEASE_DIR)) if (old.endsWith('.html')) fs.rmSync(path.join(RELEASE_DIR, old));
fs.writeFileSync(out, html);
fs.rmSync(BUILD_DIR, { recursive: true, force: true });
console.log(`\nwrote ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
