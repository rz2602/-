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
  { key: 'tree_oak_03', master: 'trees/tree_oak_03_master.png', out: 'assets/trees/tree_oak_03.webp', role: 'tree', maxDisplay: { h: 560 }, supersedes: ['tree_medium'] },
  { key: 'tree_pine_01', master: 'trees/tree_pine_01_master.png', out: 'assets/trees/tree_pine_01.webp', role: 'tree', maxDisplay: { h: 520 }, supersedes: ['pine_tree'] },
  { key: 'tree_ancient_01', master: 'trees/tree_ancient_01_master.png', out: 'assets/trees/tree_ancient_01.webp', role: 'tree', maxDisplay: { w: 640 }, supersedes: [] },
  { key: 'waterfall_01', master: 'water/waterfall_large_master.png', out: 'assets/water/waterfall_01.webp', role: 'water', maxDisplay: { w: 560 }, supersedes: ['waterfall_large', 'water_fall_band', 'waterfall_small', 'waterfall_rocks', 'water_pool_rocks'] },

  // ---- Forest Environment Asset Kit (final production integration) ----
  // Terrain/cliff/platform/bridge geometry values below are MASTER pixels read
  // off gridded inspections of each master (see art/FOREST_ASSET_INTEGRATION_REPORT.md);
  // they are stored normalized, so re-exports at another size keep working.
  // walkY = the grass (or deck) surface Mishkontin's feet stand on.
  {
    key: 'env_ground_long', master: 'environment/terrain/ground/terrain_ground_long_master.png', out: 'assets/environment/terrain/ground_long.webp',
    role: 'ground', env: true, supersedes: ['terrain_long', 'terrain_medium', 'terrain_short', 'terrain_cap_left', 'terrain_cap_right'],
    // Columns [tileFrom, tileTo] are the full-height slab, used for mirror-joined repeats; outside them are the natural rounded ends.
    geometry: { walkY: 335, tileFrom: 170, tileTo: 2010 },
  },
  { key: 'env_cliff_left', master: 'environment/terrain/cliffs/terrain_cliff_left_master.png', out: 'assets/environment/terrain/cliff_left.webp', role: 'cliff', env: true, geometry: { walkY: 345, faceX: 22, capEnd: 990 } },
  { key: 'env_cliff_right', master: 'environment/terrain/cliffs/terrain_cliff_right_master.png', out: 'assets/environment/terrain/cliff_right.webp', role: 'cliff', env: true, geometry: { walkY: 345, faceX: 1004, capEnd: 30 } },
  { key: 'env_cliff_wall', master: 'environment/terrain/cliffs/terrain_cliff_wall_master.png', out: 'assets/environment/terrain/cliff_wall.webp', role: 'cliff', env: true, geometry: { fullWidthY: 200 }, supersedes: ['cliff_pillar'] },
  { key: 'env_platform_long', master: 'environment/terrain/platforms/terrain_platform_long_master.png', out: 'assets/environment/terrain/platform_long.webp', role: 'platform', env: true, maxDisplay: { w: 250 }, geometry: { walkY: 320 }, supersedes: ['floating_platform_small', 'floating_platform_medium', 'floating_island_round'] },
  { key: 'env_platform_medium', master: 'environment/terrain/platforms/terrain_platform_medium_master.png', out: 'assets/environment/terrain/platform_medium.webp', role: 'platform', env: true, maxDisplay: { w: 240 }, geometry: { walkY: 378 } },
  { key: 'env_platform_small', master: 'environment/terrain/platforms/terrain_platform_small_master.png', out: 'assets/environment/terrain/platform_small.webp', role: 'platform', env: true, maxDisplay: { w: 220 }, geometry: { walkY: 380 } },
  { key: 'env_platform_tiny', master: 'environment/terrain/platforms/terrain_platform_tiny_master.png', out: 'assets/environment/terrain/platform_tiny.webp', role: 'platform', env: true, maxDisplay: { w: 150 }, geometry: { walkY: 392 } },

  // Not built for runtime (masters archived, not placed in this level - see
  // art/FOREST_ASSET_INTEGRATION_REPORT.md): ground left edge, cliff bottom
  // left/right, rope bridge long span, bridge entrances, broken bridge,
  // foreground leaves left/right (full-height frame strips cut on three sides).

  // Bridge span: the deck sags; deckEndY at the posts, deckMidY at the centre; posts at postLeftX / postRightX.
  { key: 'env_bridge_rope_medium', master: 'environment/bridges/bridge_rope_medium_master.png', out: 'assets/environment/bridges/bridge_rope_medium.webp', role: 'bridge', env: true, maxDisplay: { w: 320 }, supersedes: ['rope_bridge'], geometry: { deckEndY: 285, deckMidY: 462, postLeftX: 162, postRightX: 1775 } },
  { key: 'env_bridge_post', master: 'environment/bridges/bridge_post_master.png', out: 'assets/environment/bridges/bridge_post.webp', role: 'prop', env: true, maxDisplay: { h: 130 } },

  { key: 'env_rock_large_01', master: 'environment/rocks/rock_large_01_master.png', out: 'assets/environment/rocks/rock_large_01.webp', role: 'prop', env: true, maxDisplay: { h: 150 }, supersedes: ['rock_large'] },
  { key: 'env_rock_large_02', master: 'environment/rocks/rock_large_02_master.png', out: 'assets/environment/rocks/rock_large_02.webp', role: 'prop', env: true, maxDisplay: { h: 150 } },
  { key: 'env_rock_medium_01', master: 'environment/rocks/rock_medium_01_master.png', out: 'assets/environment/rocks/rock_medium_01.webp', role: 'prop', env: true, maxDisplay: { h: 100 }, supersedes: ['rock_medium', 'rock_mossy'] },
  { key: 'env_rock_medium_02', master: 'environment/rocks/rock_medium_02_master.png', out: 'assets/environment/rocks/rock_medium_02.webp', role: 'prop', env: true, maxDisplay: { h: 100 } },
  { key: 'env_rock_small_01', master: 'environment/rocks/rock_small_01_master.png', out: 'assets/environment/rocks/rock_small_01.webp', role: 'prop', env: true, maxDisplay: { h: 70 }, supersedes: ['rock_small', 'rocks_pair', 'rock_round'] },
  { key: 'env_rock_small_02', master: 'environment/rocks/rock_small_02_master.png', out: 'assets/environment/rocks/rock_small_02.webp', role: 'prop', env: true, maxDisplay: { h: 70 } },
  { key: 'env_rock_cluster_01', master: 'environment/rocks/rock_cluster_01_master.png', out: 'assets/environment/rocks/rock_cluster_01.webp', role: 'prop', env: true, maxDisplay: { h: 110 } },

  { key: 'env_bush_01', master: 'environment/vegetation/vegetation_bush_01_master.png', out: 'assets/environment/vegetation/bush_01.webp', role: 'prop', env: true, maxDisplay: { h: 100 }, supersedes: ['bush_01', 'bush_03', 'bush_small'] },
  { key: 'env_bush_02', master: 'environment/vegetation/vegetation_bush_02_master.png', out: 'assets/environment/vegetation/bush_02.webp', role: 'prop', env: true, maxDisplay: { h: 100 }, supersedes: ['bush_02', 'bush_wide', 'bush_blue'] },
  { key: 'env_fern_01', master: 'environment/vegetation/vegetation_fern_01_master.png', out: 'assets/environment/vegetation/fern_01.webp', role: 'prop', env: true, maxDisplay: { h: 100 }, supersedes: ['fern'] },
  { key: 'env_fern_02', master: 'environment/vegetation/vegetation_fern_02_master.png', out: 'assets/environment/vegetation/fern_02.webp', role: 'prop', env: true, maxDisplay: { h: 100 } },
  { key: 'env_grass_01', master: 'environment/vegetation/vegetation_grass_01_master.png', out: 'assets/environment/vegetation/grass_01.webp', role: 'prop', env: true, maxDisplay: { h: 70 }, supersedes: ['grass_tall', 'grass_tuft', 'grass_tuft_02', 'grass_patch', 'plant_small'] },
  { key: 'env_grass_02', master: 'environment/vegetation/vegetation_grass_02_master.png', out: 'assets/environment/vegetation/grass_02.webp', role: 'prop', env: true, maxDisplay: { h: 70 } },
  { key: 'env_flowers_01', master: 'environment/vegetation/vegetation_flowers_01_master.png', out: 'assets/environment/vegetation/flowers_01.webp', role: 'prop', env: true, maxDisplay: { h: 70 }, supersedes: ['flowers_blue', 'flowers_pink', 'flowers_purple'] },
  { key: 'env_flowers_02', master: 'environment/vegetation/vegetation_flowers_02_master.png', out: 'assets/environment/vegetation/flowers_02.webp', role: 'prop', env: true, maxDisplay: { h: 70 }, supersedes: ['flowers_pink_02'] },
  { key: 'env_mushrooms_01', master: 'environment/vegetation/vegetation_mushrooms_01_master.png', out: 'assets/environment/vegetation/mushrooms_01.webp', role: 'prop', env: true, maxDisplay: { h: 70 }, supersedes: ['mushroom_orange', 'mushroom_small'] },
  { key: 'env_vines_01', master: 'environment/vegetation/vegetation_vines_01_master.png', out: 'assets/environment/vegetation/vines_01.webp', role: 'prop', env: true, maxDisplay: { w: 240 } },

  { key: 'env_signpost', master: 'environment/props/prop_signpost_master.png', out: 'assets/environment/props/signpost.webp', role: 'prop', env: true, maxDisplay: { h: 170 }, supersedes: ['wooden_sign'], geometry: { lightX: 293, lightY: 329 } },
  { key: 'env_lantern_post', master: 'environment/props/prop_lantern_post_master.png', out: 'assets/environment/props/lantern_post.webp', role: 'prop', env: true, maxDisplay: { h: 210 }, geometry: { lightX: 235, lightY: 683 } },
  { key: 'env_fence_01', master: 'environment/props/prop_wood_fence_01_master.png', out: 'assets/environment/props/fence_01.webp', role: 'prop', env: true, maxDisplay: { h: 90 }, supersedes: ['wooden_fence', 'fence_post'] },
  { key: 'env_fence_02', master: 'environment/props/prop_wood_fence_02_master.png', out: 'assets/environment/props/fence_02.webp', role: 'prop', env: true, maxDisplay: { h: 90 } },
  { key: 'env_tree_stump', master: 'environment/props/prop_tree_stump_master.png', out: 'assets/environment/props/tree_stump.webp', role: 'prop', env: true, maxDisplay: { h: 90 }, supersedes: ['tree_stump'] },
  { key: 'env_fallen_log', master: 'environment/props/prop_fallen_log_master.png', out: 'assets/environment/props/fallen_log.webp', role: 'prop', env: true, maxDisplay: { h: 100 }, supersedes: ['fallen_log'] },
  { key: 'env_wood_crate', master: 'environment/props/prop_wood_crate_master.png', out: 'assets/environment/props/wood_crate.webp', role: 'prop', env: true, maxDisplay: { h: 80 }, supersedes: ['wooden_crate', 'wooden_crate_small', 'wooden_cart'] },
  { key: 'env_barrel', master: 'environment/props/prop_barrel_master.png', out: 'assets/environment/props/barrel.webp', role: 'prop', env: true, maxDisplay: { h: 80 }, supersedes: ['barrel'] },

  // Foreground: edge-framing pieces; anchor = the corner/edge that sits on the screen edge.
  { key: 'env_fg_fern_left', master: 'environment/foreground/foreground_fern_left_master.png', out: 'assets/environment/foreground/fern_left.webp', role: 'foreground', env: true, maxDisplay: { h: 270 }, supersedes: ['fg_leaves_blur', 'fg_leaves_left'] },
  { key: 'env_fg_fern_right', master: 'environment/foreground/foreground_fern_right_master.png', out: 'assets/environment/foreground/fern_right.webp', role: 'foreground', env: true, maxDisplay: { h: 270 }, supersedes: ['fg_trunk_right'] },
  { key: 'env_fg_grass_cluster_01', master: 'environment/foreground/foreground_grass_cluster_01_master.png', out: 'assets/environment/foreground/grass_cluster_01.webp', role: 'foreground', env: true, maxDisplay: { h: 200 } },
  { key: 'env_fg_flower_cluster_01', master: 'environment/foreground/foreground_flower_cluster_01_master.png', out: 'assets/environment/foreground/flower_cluster_01.webp', role: 'foreground', env: true, maxDisplay: { h: 200 } },
  { key: 'env_fg_branch', master: 'environment/foreground/foreground_branch_master.png', out: 'assets/environment/foreground/branch.webp', role: 'foreground', env: true, maxDisplay: { h: 310 }, edgeFraming: true, fixedAnchor: { x: 0, y: 0 } },

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

/**
 * Mandatory transparency audit for the environment kit: the master must have
 * a real alpha channel with genuinely transparent pixels, and (unless it is an
 * edge-framing foreground piece) transparent corners. A baked checkerboard or
 * white background fails here and the build stops - no automatic cleanup.
 */
function verifyRealAlpha(file, meta, img, edgeFraming) {
  if (!meta.hasAlpha) throw new Error(`${file}: no alpha channel (baked background?) - BLOCKED`);
  let zero = 0;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] === 0) zero++;
  if (zero / (img.width * img.height) < 0.05) throw new Error(`${file}: almost no transparent pixels - BLOCKED`);
  if (edgeFraming) return;
  const corner = (x0, y0) => {
    let sum = 0;
    for (let y = y0; y < y0 + 16; y++) for (let x = x0; x < x0 + 16; x++) sum += img.data[(y * img.width + x) * 4 + 3];
    return sum / 256;
  };
  const corners = [corner(0, 0), corner(img.width - 16, 0), corner(0, img.height - 16), corner(img.width - 16, img.height - 16)];
  if (Math.max(...corners) > 10) throw new Error(`${file}: opaque corners ${corners} - BLOCKED`);
}

/** Geometry measured in master px -> normalized: keys ending in Y by height, all others (x positions) by width. */
function normalizeGeometry(g, w, h) {
  const out = {};
  for (const [k, v] of Object.entries(g)) out[k] = round(k.endsWith('Y') ? v / h : v / w);
  return out;
}

/** First/last column with alpha > 200 on row y, normalized. */
function slabExtent(img, y) {
  let first = -1, last = -1;
  for (let x = 0; x < img.width; x++) {
    if (img.data[(y * img.width + x) * 4 + 3] > 200) {
      if (first < 0) first = x;
      last = x;
    }
  }
  return { left: round(first / img.width), right: round(last / img.width) };
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

  if (asset.env) verifyRealAlpha(masterPath, await sharp(masterPath).metadata(), await rgba(masterPath), asset.edgeFraming);
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
  if (asset.role === 'tree' || asset.role === 'water' || asset.role === 'prop' || (asset.role === 'foreground' && !asset.fixedAnchor)) entry.anchor = groundAnchor(out);
  if (asset.fixedAnchor) entry.anchor = asset.fixedAnchor;
  if (asset.geometry) entry.geometry = normalizeGeometry(asset.geometry, img.width, img.height);
  if (asset.role === 'ground' || asset.role === 'platform') {
    // Horizontal extent of the solid slab just below the walk line (the visible ground edge).
    entry.geometry.slab = slabExtent(out, Math.round((entry.geometry.walkY + 0.03) * height));
  }
  if (asset.env) entry.alpha = 'A (real alpha channel verified)';
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
