// Builds one self-contained HTML file (JS, CSS and pictures inlined) that
// opens straight from the disk: release/mishkontin-heroes.html
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

execSync('npx vite build', { stdio: 'inherit' });
const dist = 'dist';
let html = readFileSync(`${dist}/index.html`, 'utf8');
const asset = (re) => readdirSync(`${dist}/assets`).find((f) => re.test(f));
let js = readFileSync(`${dist}/assets/${asset(/\.js$/)}`, 'utf8');
let css = readFileSync(`${dist}/assets/${asset(/\.css$/)}`, 'utf8');

// Pictures referenced as "img/<name>" become data: URIs, stored once in
// window.__IMG; quoted string literals in the bundle point to that table.
const images = {};
for (const f of readdirSync(`${dist}/img`)) {
  const mime = f.endsWith('.webp') ? 'image/webp' : 'image/png';
  images[f] = `data:${mime};base64,${readFileSync(`${dist}/img/${f}`).toString('base64')}`;
  for (const q of ['"', "'"]) js = js.split(`${q}img/${f}${q}`).join(`window.__IMG[${JSON.stringify(f)}]`);
  js = js.split(`img/${f}`).join(images[f]); // anything left inside longer strings
  css = css.split(`img/${f}`).join(images[f]);
}
const icon = `data:image/png;base64,${readFileSync(`${dist}/favicon.png`).toString('base64')}`;

html = html
  .replace(/<script type="module"[^>]*src="[^"]+"><\/script>\s*/, '')
  .replace(/<link rel="stylesheet"[^>]*>\s*/, '')
  .replace('href="./favicon.png"', `href="${icon}"`)
  .replace('</head>', () => `<style>\n${css}\n</style>\n</head>`)
  .replace('</body>', () => `<script>window.__IMG = ${JSON.stringify(images)};</script>\n<script type="module">\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>\n</body>`);

mkdirSync('release', { recursive: true });
const out = 'release/mishkontin-heroes.html';
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(0)} KB`);
