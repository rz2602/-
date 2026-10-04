#!/usr/bin/env node
/**
 * Production art pipeline (v0.1.1 Ultra Detail pass).
 *
 * Masters (art/masters/**, never modified) -> runtime copies (public/assets/**).
 *
 *   1. Verifies every master against the SHA-256 in art/masters/MANIFEST.json.
 *   2. Alpha cleanup on the RUNTIME copy only (approved): nearly-solid subject
 *      pixels (alpha >= 240) become fully opaque, invisible specks (alpha < 4)
 *      become fully transparent.
 *   3. Resizes (Lanczos, premultiplied) to the size the asset actually needs:
 *      runtime px = maxDisplay (logical px) x DISPLAY_FACTOR, never above the
 *      master size. DISPLAY_FACTOR 2.4 = 100% at 1440p (render scale 2) with
 *      20% headroom, i.e. ~125% at 4K and ~0.6x at 1080p.
 *      Parallax backgrounds keep their native size (they are displayed at
 *      ~120% of native at 1440p already).
 *   4. Encodes: alpha art as LOSSLESS WebP (verified pixel-identical to the
 *      cleaned PNG), the opaque sky as high-quality WebP (PSNR reported),
 *      brand assets as PNG (required names).
 *   5. Measures semantic anchors on the runtime image and stores them
 *      NORMALIZED (0..1): ground contact for trees/waterfall, content band for
 *      parallax layers.
 *
 * Output: public/assets/production-assets.json (world assets only - brand
 * assets are screen-space UI and are deliberately NOT listed there).
 *
 * Usage: npm run production-assets
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = path.join(ROOT, 'art/masters');
const PUBLIC = path.join(ROOT, 'public');
const MANIFEST_OUT = 'assets/production-assets.json';
const DISPLAY_FACTOR = 2.4;
const SOLID_ALPHA = 240;
const SPECK_ALPHA = 4;
const SKY_WEBP_QUALITY = 95;

/**
 * role: 'layer' (parallax background), 'tree', 'water', 'brand'
 * maxDisplay: largest on-screen size in LOGICAL px, { w } or { h }
 * supersedes: legacy forest-kit keys this asset replaces (they stop loading)
 */
const ASSETS = [
  { key: 'bg_layer_sky', master: 'backgrounds/bg_sky_master.png', out: 'assets/backgrounds/bg_sky.webp', role: 'layer', format: 'webp-lossy', supersedes: ['bg_sky'] },
  {
    key: 'bg_layer_mountains', master: 'backgrounds/bg_mountains_sirengrad_master.png', out: 'assets/backgrounds/bg_mountains_sirengrad.webp',
    role: 'layer', format: 'webp-lossless', supersedes: ['bg_mountains'],
    // Sirengrad occupies source x ~1180-1760. Columns before castleFreeEnd
    // contain no castle and are used for the (mirrored) extension copies. The
    // join sits exactly on the range's tallest peak (x 970), so mirroring
    // produces one symmetric peak instead of a visible V-shaped seam.
    castleFreeEnd: 970,
  },
  { key: 'bg_layer_forest_distant', master: 'backgrounds/bg_forest_distant_master.png', out: 'assets/backgrounds/bg_forest_distant.webp', role: 'layer', format: 'webp-lossless', supersedes: ['bg_forest_distant'] },
  { key: 'bg_layer_forest_mid', master: 'backgrounds/bg_forest_mid_master.png', out: 'assets/backgrounds/bg_forest_mid.webp', role: 'layer', format: 'webp-lossless', supersedes: ['bg_forest_mid'] },

  { key: 'tree_oak_01', master: 'trees/tree_oak_01_master.png', out: 'assets/trees/tree_oak_01.webp', role: 'tree', maxDisplay: { h: 560 }, supersedes: ['tree_large_01'] },
  { key: 'tree_oak_02', master: 'trees/tree_oak_02_master.png', out: 'assets/trees/tree_oak_02.webp', role: 'tree', maxDisplay: { h: 560 }, supersedes: ['tree_large_02'] },
  { key: 'tree_oak_03', master: 'trees/tree_oak_03_master.png', out: 'assets/trees/tree_oak_03.webp', role: 'tree', maxDisplay: { h: 560 }, supersedes: [] },
  { key: 'tree_pine_01', master: 'trees/tree_pine_01_master.png', out: 'assets/trees/tree_pine_01.webp', role: 'tree', maxDisplay: { h: 520 }, supersedes: ['pine_tree'] },
  { key: 'tree_ancient_01', master: 'trees/tree_ancient_01_master.png', out: 'assets/trees/tree_ancient_01.webp', role: 'tree', maxDisplay: { w: 640 }, supersedes: [] },
  { key: 'waterfall_01', master: 'water/waterfall_large_master.png', out: 'assets/water/waterfall_01.webp', role: 'water', maxDisplay: { w: 560 }, supersedes: ['waterfall_large', 'water_fall_band'] },

  { key: 'brand_wordmark', master: 'branding/mishkontin-wordmark-master.png', out: 'assets/ui/branding/mishkontin-wordmark.png', role: 'brand', maxDisplay: { w: 680 }, trim: true },
  { key: 'brand_emblem', master: 'branding/mishkontin-emblem-master.png', out: 'assets/ui/branding/mishkontin-emblem.png', role: 'brand', maxDisplay: { w: 280 }, trim: true },
];

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

const masterManifest = JSON.parse(fs.readFileSync(path.join(MASTERS, 'MANIFEST.json'), 'utf8'));
const checksums = new Map(masterManifest.masters.map((m) => [m.master, m.sha256]));

/** Raw RGBA of an image. */
async function rgba(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function cleanupAlpha(img) {
  let solid = 0;
  let specks = 0;
  for (let i = 3; i < img.data.length; i += 4) {
    const a = img.data[i];
    if (a >= SOLID_ALPHA && a < 255) {
      img.data[i] = 255;
      solid++;
    } else if (a > 0 && a < SPECK_ALPHA) {
      img.data[i] = 0;
      img.data[i - 1] = img.data[i - 2] = img.data[i - 3] = 0;
      specks++;
    }
  }
  return { solid, specks };
}

/** Bounding box of pixels with alpha > threshold. */
function alphaBox(img, threshold = 8) {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/**
 * Ground contact: lowest row whose solid span is at least 30% of the content
 * width (skips stray grass tips below the mound). X = centre of that span.
 */
function groundAnchor(img) {
  const box = alphaBox(img, 128);
  const minSpan = (box.x1 - box.x0 + 1) * 0.3;
  for (let y = box.y1; y >= box.y0; y--) {
    let first = -1, last = -1, count = 0;
    for (let x = box.x0; x <= box.x1; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 128) {
        if (first < 0) first = x;
        last = x;
        count++;
      }
    }
    if (count >= minSpan) return { x: round((first + last) / 2 / img.width), y: round((y + 1) / img.height) };
  }
  return { x: 0.5, y: 1 };
}

/** Rows where a parallax layer has substantial content (>= 50% coverage). */
function contentBand(img) {
  let top = -1, bottom = -1;
  for (let y = 0; y < img.height; y++) {
    let covered = 0;
    for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] > 128) covered++;
    if (covered >= img.width * 0.5) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  return { top: round(top / img.height), bottom: round((bottom + 1) / img.height) };
}

/** First column where the layer has >= 60% of its tallest column's content (trims tapered ends). */
function solidColumns(img) {
  const heights = new Array(img.width).fill(0);
  for (let x = 0; x < img.width; x++) {
    for (let y = 0; y < img.height; y++) if (img.data[(y * img.width + x) * 4 + 3] > 128) heights[x]++;
  }
  const max = Math.max(...heights);
  const left = heights.findIndex((h) => h >= max * 0.6);
  const right = img.width - 1 - [...heights].reverse().findIndex((h) => h >= max * 0.6);
  return { left, right };
}

/** Identical alpha everywhere and identical RGB wherever alpha > 0 (RGB under alpha 0 is invisible). */
function visiblyIdentical(a, b) {
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] !== b[i + 3]) return false;
    if (a[i + 3] > 0 && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])) return false;
  }
  return true;
}

function psnr(a, b) {
  let mse = 0;
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    if (i % 4 === 3) continue;
    mse += (a[i] - b[i]) ** 2;
    n++;
  }
  mse /= n;
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}

const runtime = { generatedBy: 'tools/build-production-assets.mjs', displayFactor: DISPLAY_FACTOR, assets: {} };
const brand = {};

for (const asset of ASSETS) {
  const masterPath = path.join(MASTERS, asset.master);
  const expected = checksums.get(asset.master);
  const actual = sha256(masterPath);
  if (!expected || expected !== actual) throw new Error(`${asset.master}: master checksum mismatch - masters must not change`);

  let img = await rgba(masterPath);
  const cleanup = asset.format === 'webp-lossy' ? { solid: 0, specks: 0 } : cleanupAlpha(img);

  let trimmed = null;
  if (asset.trim) {
    const box = alphaBox(img, 3);
    const pad = Math.round(Math.max(box.x1 - box.x0, box.y1 - box.y0) * 0.01);
    const left = Math.max(0, box.x0 - pad);
    const top = Math.max(0, box.y0 - pad);
    const w = Math.min(img.width, box.x1 + pad + 1) - left;
    const h = Math.min(img.height, box.y1 + pad + 1) - top;
    const buf = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
      .extract({ left, top, width: w, height: h }).raw().toBuffer();
    img = { data: buf, width: w, height: h };
    trimmed = { left, top, width: w, height: h };
  }

  // Target runtime size.
  let width = img.width;
  let height = img.height;
  if (asset.maxDisplay) {
    const target = asset.maxDisplay.w
      ? { w: Math.ceil(asset.maxDisplay.w * DISPLAY_FACTOR) }
      : { h: Math.ceil(asset.maxDisplay.h * DISPLAY_FACTOR) };
    const k = Math.min(1, target.w ? target.w / img.width : target.h / img.height);
    width = Math.round(img.width * k);
    height = Math.round(img.height * k);
  }

  let pipeline = sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } });
  if (width !== img.width) pipeline = pipeline.resize(width, height, { kernel: 'lanczos3' });
  const resized = await pipeline.raw().toBuffer();
  const out = { data: resized, width, height };

  const outPath = path.join(PUBLIC, asset.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const raw = sharp(resized, { raw: { width, height, channels: 4 } });
  let quality = 'lossless';
  if (asset.format === 'webp-lossy') {
    await raw.removeAlpha().webp({ quality: SKY_WEBP_QUALITY, smartSubsample: true }).toFile(outPath);
    const back = await rgba(outPath);
    quality = `lossy q${SKY_WEBP_QUALITY}, PSNR ${psnr(resized, back.data).toFixed(1)} dB`;
  } else if (asset.role === 'brand') {
    await raw.png({ compressionLevel: 9 }).toFile(outPath);
    quality = 'png';
  } else {
    await raw.webp({ lossless: true, effort: 6 }).toFile(outPath);
    const back = await rgba(outPath);
    if (!visiblyIdentical(back.data, resized)) throw new Error(`${asset.key}: lossless WebP round-trip is not pixel-identical`);
  }

  const entry = {
    path: asset.out,
    role: asset.role,
    width,
    height,
    master: `art/masters/${asset.master}`,
    masterSize: [img.width, img.height],
    masterSha256: actual,
    encoding: quality,
    alphaCleanup: cleanup,
    bytes: fs.statSync(outPath).size,
  };
  if (trimmed) entry.trimmedFromMaster = trimmed;
  if (asset.role === 'tree' || asset.role === 'water') entry.anchor = groundAnchor(out);
  if (asset.role === 'layer' && asset.format !== 'webp-lossy') {
    entry.contentBand = contentBand(out);
    const cols = solidColumns(out);
    entry.solidColumns = { left: round(cols.left / width), right: round(cols.right / width) };
  }
  if (asset.castleFreeEnd) entry.castleFreeEnd = round(asset.castleFreeEnd / img.width);
  if (asset.supersedes?.length) entry.supersedes = asset.supersedes;

  if (asset.role === 'brand') brand[asset.key] = entry;
  else runtime.assets[asset.key] = entry;
  console.log(`${asset.key.padEnd(24)} ${img.width}x${img.height} -> ${width}x${height}  ${(entry.bytes / 1024).toFixed(0)} KB  ${quality}`);
}

fs.writeFileSync(path.join(PUBLIC, MANIFEST_OUT), JSON.stringify(runtime, null, 2) + '\n');
// Brand provenance lives with the masters, NOT in any world manifest.
fs.writeFileSync(path.join(MASTERS, 'branding/RUNTIME.json'), JSON.stringify(brand, null, 2) + '\n');
console.log(`wrote public/${MANIFEST_OUT} and art/masters/branding/RUNTIME.json`);
