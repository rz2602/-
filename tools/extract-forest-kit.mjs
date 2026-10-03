#!/usr/bin/env node
/**
 * Forest environment kit extractor (v0.1.1 art pass).
 *
 * Input:  art/source/forest-environment-kit-v1.png  (1125x750 RGBA reference
 *         sheet with labelled groups of pieces on a transparent background)
 * Output: public/assets/environments/forest/<folder>/<key>.png
 *         public/assets/environments/forest/forest-assets.json  (manifest)
 *
 * The sheet is a reference/art-direction kit, not a production atlas, so:
 *   - every piece is cut out by CONNECTED COMPONENTS (not plain rectangles):
 *     neighbouring objects, labels and stray specks never leak into a piece;
 *   - background strips are cropped clear of their labels, made opaque,
 *     optionally mirror-tiled (seamless horizontal repeat) and top-feathered
 *     so stacked parallax layers blend;
 *   - two pieces carry a Mickey-Mouse-head symbol (sign, waystone). That is a
 *     third-party trademark, so it is clone-stamped away with surrounding wood
 *     / stone texture before extraction. The waystone gets its own paw glyph
 *     in code (src/levels/forest/WaystoneVisual.ts). The banner is not used.
 *
 * All outputs are TEMPORARY, reference-derived art at the sheet's low
 * resolution (pieces are scaled up in game). Replace them with final art of
 * the same key and roughly the same proportions.
 *
 * Usage: npm run forest-kit   (add --preview out.png for a contact sheet)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'art/source/forest-environment-kit-v1.png');
const OUT = path.join(ROOT, 'public/assets/environments/forest');
const MANIFEST = path.join(OUT, 'forest-assets.json');
const PUBLIC_PREFIX = 'assets/environments/forest';

const COMPONENT_ALPHA = 24; // alpha above this forms object components
const MIN_COMPONENT = 6; // px; smaller specks are noise
const HALO_RADIUS = 2; // faint anti-aliasing kept around chosen components

/**
 * Clone-stamp patches applied to the sheet before extraction.
 * [srcX, srcY, w, h, dstX, dstY]
 */
const PATCHES = [
  // Sign: cover the carved Mickey head with plank wood from the same rows.
  [709, 449, 12, 26, 729, 449],
  [713, 449, 15, 26, 741, 449],
  // Waystone: cover the glowing Mickey head with stone from below it.
  [1019, 505, 36, 20, 1019, 464],
  [1019, 512, 36, 20, 1019, 483],
];

/** Group label pills on the sheet, cleared before anything else: [x0, y0, x1, y1]. */
const LABEL_PILLS = [
  [5, 3, 243, 29], // BACKGROUND LAYERS
  [540, 6, 641, 27], // TREES
  [538, 235, 647, 255], // BUSHES & PLANTS
  [540, 297, 641, 318], // ROCKS & NATURE
  [896, 297, 985, 317], // SMALL DETAILS
  [5, 382, 265, 406], // TERRAIN & PLATFORM TILES
  [6, 615, 115, 636], // WATER & EFFECTS
  [695, 403, 882, 426], // PROPS & INTERACTIVE OBJECTS
  [610, 618, 829, 640], // FOREGROUND VEGETATION
];
const PILL_PADDING = 2;

/**
 * Named points/rects on the SHEET, exported relative to each piece's top-left
 * so code can attach effects (glyph, light, deck line, animated water).
 */
const ANCHORS = {
  waystone: { glyph: [1036, 486] },
  lantern_post: { light: [955, 449] },
  rope_bridge: { deckTop: [868, 523], deckLeft: [785, 523], deckRight: [952, 523] },
  waterfall_large: { fallA: [37, 645, 92, 705], fallB: [118, 640, 170, 705], pool: [5, 715] },
  terrain_cap: { walkY: [0, 416] },
  terrain_cap_left: { walkY: [0, 416] },
  terrain_cap_right: { walkY: [0, 416] },
};

/**
 * Pieces. rect = [x0, y0, x1, y1] on the sheet.
 *   object : components whose centroid lies in rect (clipped to rect + pad)
 *   strip  : plain opaque crop (backgrounds)
 *   region : plain crop keeping alpha (terrain sub-parts)
 */
const PIECES = [
  // ---- background (parallax strips) ----
  { key: 'bg_sky', folder: 'background', mode: 'strip', rect: [90, 46, 533, 94], mirrorTile: true, featherTop: 0.15, featherBottom: 0.45 },
  { key: 'bg_mountains', folder: 'background', mode: 'strip', rect: [115, 104, 533, 181], featherTop: 0.25 },
  { key: 'bg_forest_distant', folder: 'background', mode: 'strip', rect: [100, 188, 533, 274], mirrorTile: true, featherTop: 0.45, padBottom: 2 },
  { key: 'bg_forest_mid', folder: 'background', mode: 'strip', rect: [80, 281, 533, 370], mirrorTile: true, featherTop: 0.5, padBottom: 2 },

  // ---- trees ----
  { key: 'tree_large_01', folder: 'trees', rect: [545, 20, 790, 232], seeds: [[650, 175], [600, 90], [700, 60], [570, 150]] },
  { key: 'tree_large_02', folder: 'trees', rect: [795, 20, 950, 232], seeds: [[858, 175], [870, 80], [820, 60], [930, 120]] },
  { key: 'tree_medium', folder: 'trees', rect: [950, 30, 1030, 232], seeds: [[1000, 190], [1000, 60], [1000, 125], [985, 215]] },
  { key: 'pine_tree', folder: 'trees', rect: [1030, 15, 1122, 232], seeds: [[1077, 140], [1080, 210], [1075, 50], [1100, 170]] },

  // ---- plants ----
  { key: 'bush_01', folder: 'plants', rect: [545, 250, 620, 292] },
  { key: 'bush_02', folder: 'plants', rect: [622, 245, 700, 292] },
  { key: 'bush_03', folder: 'plants', rect: [702, 240, 760, 292], seeds: [[730, 268]] },
  { key: 'bush_blue', folder: 'plants', rect: [762, 250, 815, 292], seeds: [[788, 272]] },
  { key: 'grass_tall', folder: 'plants', rect: [818, 255, 860, 292] },
  { key: 'bush_small', folder: 'plants', rect: [862, 258, 905, 292] },
  { key: 'bush_wide', folder: 'plants', rect: [985, 250, 1122, 292] },
  { key: 'plant_small', folder: 'plants', rect: [705, 322, 748, 346] },
  { key: 'grass_patch', folder: 'plants', rect: [840, 352, 895, 396] },
  { key: 'mushroom_red', folder: 'plants', rect: [898, 318, 950, 352] },
  { key: 'mushroom_orange', folder: 'plants', rect: [950, 318, 988, 352] },
  { key: 'mushroom_small', folder: 'plants', rect: [988, 322, 1010, 352] },
  { key: 'flowers_white', folder: 'plants', rect: [1010, 312, 1045, 352] },
  { key: 'flowers_blue', folder: 'plants', rect: [1045, 318, 1078, 352] },
  { key: 'flowers_pink', folder: 'plants', rect: [1078, 312, 1122, 352] },
  { key: 'grass_tuft', folder: 'plants', rect: [898, 352, 942, 396] },
  { key: 'grass_tuft_02', folder: 'plants', rect: [942, 352, 988, 396] },
  { key: 'fern', folder: 'plants', rect: [988, 346, 1045, 396] },
  { key: 'flowers_purple', folder: 'plants', rect: [1045, 346, 1078, 396] },
  { key: 'flowers_pink_02', folder: 'plants', rect: [1078, 346, 1122, 396] },

  // ---- rocks & nature ----
  { key: 'rock_mossy', folder: 'rocks', rect: [908, 248, 985, 292] },
  { key: 'rock_large', folder: 'rocks', rect: [538, 318, 645, 396] },
  { key: 'rock_medium', folder: 'rocks', rect: [645, 305, 705, 346] },
  { key: 'rock_small', folder: 'rocks', rect: [645, 346, 702, 396] },
  { key: 'fallen_log', folder: 'rocks', rect: [770, 318, 890, 352], seeds: [[840, 335], [800, 345], [870, 330]] },
  { key: 'rock_round', folder: 'rocks', rect: [765, 305, 815, 335], seeds: [[788, 320]] },
  { key: 'tree_stump', folder: 'rocks', rect: [702, 346, 752, 396] },
  { key: 'rocks_pair', folder: 'rocks', rect: [770, 352, 840, 396] },

  // ---- terrain ----
  { key: 'terrain_long', folder: 'terrain', rect: [5, 400, 275, 465] },
  { key: 'terrain_medium', folder: 'terrain', rect: [278, 400, 392, 465] },
  { key: 'terrain_short', folder: 'terrain', rect: [393, 400, 495, 465] },
  { key: 'floating_platform_small', folder: 'terrain', rect: [480, 462, 545, 515] },
  { key: 'floating_platform_medium', folder: 'terrain', rect: [240, 550, 322, 622], seeds: [[282, 590]] },
  { key: 'terrain_wide_block', output: false, rect: [84, 468, 282, 550], seeds: [[150, 515], [255, 515]] },
  { key: 'floating_island_round', folder: 'terrain', rect: [500, 400, 598, 465] },
  { key: 'cliff_pillar', folder: 'terrain', rect: [295, 465, 405, 618] },
  // Seamless sub-parts for the modular terrain renderer:
  { key: 'terrain_cap', folder: 'terrain', mode: 'region', rect: [45, 402, 235, 462], mirrorTile: true },
  { key: 'terrain_cap_left', folder: 'terrain', mode: 'region', rect: [5, 402, 45, 462] },
  { key: 'terrain_cap_right', folder: 'terrain', mode: 'region', rect: [235, 402, 275, 462] },
  { key: 'terrain_fill', folder: 'terrain', mode: 'strip', rect: [95, 505, 205, 545], mirrorTile: true, mirrorTileY: true },

  // ---- water ----
  { key: 'waterfall_large', folder: 'water', rect: [5, 636, 205, 748] },
  { key: 'waterfall_small', folder: 'water', rect: [188, 636, 242, 694] },
  { key: 'waterfall_rocks', folder: 'water', rect: [350, 640, 442, 703] },
  { key: 'water_pool_rocks', folder: 'water', rect: [448, 640, 600, 692] },
  { key: 'water_strip', folder: 'water', mode: 'strip', rect: [210, 712, 340, 744], mirrorTile: true },
  { key: 'water_fall_band', folder: 'water', mode: 'strip', rect: [194, 645, 236, 672], featherLeft: 10, featherRight: 10 },

  // ---- props ----
  { key: 'wooden_sign', folder: 'props', rect: [688, 428, 790, 545], clip: [688, 428, 788, 545] },
  { key: 'fence_post', folder: 'props', rect: [798, 445, 832, 482] },
  { key: 'wooden_fence', folder: 'props', rect: [838, 435, 908, 482] },
  { key: 'rope_bridge', folder: 'props', rect: [768, 478, 968, 558] },
  { key: 'lantern_post', folder: 'props', rect: [938, 415, 1012, 518], seeds: [[992, 470], [955, 447], [992, 505], [975, 432]] },
  { key: 'waystone', folder: 'props', rect: [958, 445, 1120, 605], seeds: [[1037, 490], [1045, 570], [1000, 575], [1090, 560]] },
  { key: 'wooden_crate', folder: 'props', rect: [688, 548, 768, 602] },
  { key: 'barrel', folder: 'props', rect: [772, 558, 822, 602] },
  { key: 'wooden_cart', folder: 'props', rect: [825, 552, 948, 602] },
  { key: 'wooden_crate_small', folder: 'props', rect: [1075, 498, 1118, 538], seeds: [[1096, 518]] },
  // Banner carries a Mickey symbol: seeded only so it is split off, never output.
  { key: 'banner', output: false, rect: [1058, 400, 1108, 499], seeds: [[1082, 440], [1082, 470]] },

  // ---- foreground (overlay) ----
  { key: 'fg_leaves_left', folder: 'foreground', mode: 'region', rect: [608, 641, 800, 745], featherRight: 30 },
  { key: 'fg_leaves_blur', folder: 'foreground', mode: 'region', rect: [790, 641, 940, 745], featherLeft: 30, featherRight: 30 },
  { key: 'fg_trunk_right', folder: 'foreground', mode: 'region', rect: [930, 641, 1122, 745], featherLeft: 30 },
];

// ---------------------------------------------------------------------------
const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H } = src;
const N = W * H;
const data = Buffer.from(src.data); // working copy (patched)
const original = src.data;

for (const [sx, sy, w, h, dx, dy] of PATCHES) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Feather the patch border (3 px) so the clone blends in.
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const t = Math.min(1, (edge + 1) / 3);
      const s = ((sy + y) * W + sx + x) * 4;
      const d = ((dy + y) * W + dx + x) * 4;
      for (let c = 0; c < 4; c++) data[d + c] = Math.round(data[d + c] * (1 - t) + original[s + c] * t);
    }
  }
}

for (const [x0, y0, x1, y1] of LABEL_PILLS) {
  for (let y = y0 - PILL_PADDING; y < y1 + PILL_PADDING; y++) {
    for (let x = x0 - PILL_PADDING; x < x1 + PILL_PADDING; x++) data[(y * W + x) * 4 + 3] = 0;
  }
}

const NEIGHBOURS_8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const labels = new Int32Array(N).fill(-1);
const comps = [];
{
  const stack = [];
  for (let start = 0; start < N; start++) {
    if (data[start * 4 + 3] <= COMPONENT_ALPHA || labels[start] !== -1) continue;
    const id = comps.length;
    let sx = 0, sy = 0, count = 0;
    labels[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      const px = p % W, py = (p - px) / W;
      sx += px; sy += py; count++;
      for (const [ox, oy] of NEIGHBOURS_8) {
        const nx = px + ox, ny = py + oy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (data[q * 4 + 3] > COMPONENT_ALPHA && labels[q] === -1) {
          labels[q] = id;
          stack.push(q);
        }
      }
    }
    comps.push({ cx: sx / count, cy: sy / count, count });
  }
}

const inRect = (x, y, [x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1;

// --- merged components: split between seeded pieces ------------------------
// Some objects touch on the sheet (tree crowns, grass bases...). A component
// holding seeds of 2+ pieces is "contested" and split by an edge-aware
// geodesic flood fill from the seeds (same idea as the character tool).
const SEED_RADIUS = 6;
const seedOwner = new Map(); // component -> Map(pieceKey -> seed pixel list)
for (const piece of PIECES) {
  for (const [sx, sy] of piece.seeds ?? []) {
    const pixels = [];
    for (let y = sy - SEED_RADIUS; y <= sy + SEED_RADIUS; y++) {
      for (let x = sx - SEED_RADIUS; x <= sx + SEED_RADIUS; x++) {
        const i = y * W + x;
        if ((x - sx) ** 2 + (y - sy) ** 2 <= SEED_RADIUS ** 2 && labels[i] !== -1) pixels.push(i);
      }
    }
    if (!pixels.length) throw new Error(`${piece.key}: seed ${sx},${sy} is on transparent pixels`);
    const comp = labels[pixels[0]];
    if (!seedOwner.has(comp)) seedOwner.set(comp, new Map());
    const byPiece = seedOwner.get(comp);
    if (!byPiece.has(piece.key)) byPiece.set(piece.key, []);
    byPiece.get(piece.key).push(...pixels.filter((i) => labels[i] === comp));
  }
}
const contested = new Set([...seedOwner].filter(([, m]) => m.size > 1).map(([c]) => c));
const assigned = new Map(); // pixel -> pieceKey, only inside contested components
{
  const cost = new Int32Array(N).fill(-1);
  const BUCKETS = 192;
  const buckets = Array.from({ length: BUCKETS }, () => []);
  let pending = 0;
  for (const comp of contested) {
    for (const [key, pixels] of seedOwner.get(comp)) {
      for (const p of pixels) {
        cost[p] = 0;
        assigned.set(p, key);
        buckets[0].push(p);
        pending++;
      }
    }
  }
  for (let c = 0; pending > 0; c++) {
    const bucket = buckets[c % BUCKETS];
    while (bucket.length) {
      const p = bucket.pop();
      pending--;
      if (cost[p] !== c) continue;
      const px = p % W, py = (p - px) / W;
      for (const [ox, oy] of NEIGHBOURS_8) {
        const nx = px + ox, ny = py + oy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (labels[q] !== labels[p]) continue;
        const diff = Math.max(
          Math.abs(data[p * 4] - data[q * 4]),
          Math.abs(data[p * 4 + 1] - data[q * 4 + 1]),
          Math.abs(data[p * 4 + 2] - data[q * 4 + 2]),
        );
        const nc = c + 1 + Math.floor(diff / 6) + Math.floor((255 - Math.min(data[p * 4 + 3], data[q * 4 + 3])) / 3);
        if (cost[q] === -1 || nc < cost[q]) {
          cost[q] = nc;
          assigned.set(q, assigned.get(p));
          buckets[nc % BUCKETS].push(q);
          pending++;
        }
      }
    }
  }
  console.log(`split ${contested.size} merged components between seeded pieces`);
}

function makeImage(w, h) {
  const img = new PNG({ width: w, height: h });
  img.data.fill(0);
  return img;
}

function cropRegion([x0, y0, x1, y1], opaque) {
  const img = makeImage(x1 - x0, y1 - y0);
  img.originX = x0;
  img.originY = y0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const s = (y * W + x) * 4;
      const d = ((y - y0) * img.width + (x - x0)) * 4;
      data.copy(img.data, d, s, s + 4);
      if (opaque) img.data[d + 3] = 255;
    }
  }
  return img;
}

function cropObject(piece) {
  const pad = 14;
  const [r0, r1, r2, r3] = piece.rect;
  const clip = piece.clip ?? [r0 - pad, r1 - pad, r2 + pad, r3 + pad];
  const chosen = new Set();
  comps.forEach((c, id) => {
    // Components seeded by another piece belong to that piece only.
    const seededByOther = seedOwner.has(id) && !seedOwner.get(id).has(piece.key);
    if (c.count >= MIN_COMPONENT && !contested.has(id) && !seededByOther && inRect(c.cx, c.cy, piece.rect)) chosen.add(id);
  });
  // Seeded components: whole if uncontested, else only this piece's share.
  for (const [comp, byPiece] of seedOwner) {
    if (byPiece.has(piece.key) && !contested.has(comp)) chosen.add(comp);
  }
  const owns = (i) => chosen.has(labels[i]) || assigned.get(i) === piece.key;
  // Keep chosen components + their faint halo, inside the clip rect.
  const keep = new Uint8Array(N);
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = Math.max(0, clip[1]); y < Math.min(H, clip[3]); y++) {
    for (let x = Math.max(0, clip[0]); x < Math.min(W, clip[2]); x++) {
      const i = y * W + x;
      let ok = owns(i);
      if (!ok && data[i * 4 + 3] > 0 && labels[i] === -1) {
        for (let oy = -HALO_RADIUS; oy <= HALO_RADIUS && !ok; oy++) {
          for (let ox = -HALO_RADIUS; ox <= HALO_RADIUS && !ok; ox++) {
            const nx = x + ox, ny = y + oy;
            if (nx >= 0 && ny >= 0 && nx < W && ny < H && owns(ny * W + nx)) ok = true;
          }
        }
      }
      if (!ok) continue;
      keep[i] = 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error(`${piece.key}: nothing selected`);
  const img = makeImage(maxX - minX + 1, maxY - minY + 1);
  img.originX = minX;
  img.originY = minY;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * W + x;
      if (!keep[i]) continue;
      data.copy(img.data, ((y - minY) * img.width + (x - minX)) * 4, i * 4, i * 4 + 4);
    }
  }
  return img;
}

/**
 * Transparent rows at the bottom of a strip. Tiled sprites wrap vertically
 * too, so without this the strip's opaque bottom row bleeds into its
 * transparent top edge as a thin line.
 */
function padBottom(img, rows) {
  const out = makeImage(img.width, img.height + rows);
  img.data.copy(out.data, 0, 0, img.data.length);
  return out;
}

function mirrorTile(img, vertical) {
  const w = img.width, h = img.height;
  const out = makeImage(vertical ? w : w * 2, vertical ? h * 2 : h);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const sx = !vertical && x >= w ? 2 * w - 1 - x : x;
      const sy = vertical && y >= h ? 2 * h - 1 - y : y;
      img.data.copy(out.data, (y * out.width + x) * 4, (sy * w + sx) * 4, (sy * w + sx) * 4 + 4);
    }
  }
  return out;
}

const smooth = (t) => t * t * (3 - 2 * t);

function feather(img, { featherTop = 0, featherBottom = 0, featherLeft = 0, featherRight = 0 }) {
  const fTop = Math.round(img.height * featherTop);
  const fBottom = Math.round(img.height * featherBottom);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let k = 1;
      if (fTop && y < fTop) k *= smooth(y / fTop);
      if (fBottom && y >= img.height - fBottom) k *= smooth((img.height - 1 - y) / fBottom);
      if (featherLeft && x < featherLeft) k *= smooth(x / featherLeft);
      if (featherRight && x >= img.width - featherRight) k *= smooth((img.width - 1 - x) / featherRight);
      const o = (y * img.width + x) * 4 + 3;
      img.data[o] = Math.round(img.data[o] * k);
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });
const manifest = {
  generatedBy: 'tools/extract-forest-kit.mjs',
  source: 'art/source/forest-environment-kit-v1.png',
  status: 'TEMPORARY reference-derived art (low resolution) - replace with final art',
  assets: {},
};
const previews = [];

for (const piece of PIECES) {
  if (piece.output === false) continue;
  const mode = piece.mode ?? 'object';
  let img = mode === 'object' ? cropObject(piece) : cropRegion(piece.rect, mode === 'strip');
  const { originX, originY } = img;
  if (piece.mirrorTile) img = mirrorTile(img, false);
  if (piece.mirrorTileY) img = mirrorTile(img, true);
  feather(img, piece);
  if (piece.padBottom) img = padBottom(img, piece.padBottom);
  const dir = path.join(OUT, piece.folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${piece.key}.png`), PNG.sync.write(img, { colorType: 6, deflateLevel: 9 }));
  const entry = { path: `${PUBLIC_PREFIX}/${piece.folder}/${piece.key}.png`, width: img.width, height: img.height };
  if (ANCHORS[piece.key]) {
    entry.anchors = {};
    for (const [name, v] of Object.entries(ANCHORS[piece.key])) {
      entry.anchors[name] = v.map((n, i) => n - (i % 2 === 0 ? originX : originY));
    }
  }
  manifest.assets[piece.key] = entry;
  previews.push({ key: piece.key, img });
}
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
const bytes = previews.reduce((n, p) => n + fs.statSync(path.join(ROOT, 'public', manifest.assets[p.key].path)).size, 0);
console.log(`extracted ${previews.length} pieces, ${(bytes / 1024).toFixed(0)} KB total -> ${path.relative(ROOT, OUT)}`);

// Optional contact sheet for visual review: --preview out.png
const pi = process.argv.indexOf('--preview');
if (pi !== -1) {
  const cols = 8, cell = 170;
  const sheet = makeImage(cols * cell, Math.ceil(previews.length / cols) * cell);
  for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([45, 30, 70, 255], i);
  previews.forEach(({ img }, n) => {
    const s = Math.min(1, (cell - 10) / img.width, (cell - 10) / img.height);
    const ox = (n % cols) * cell + 5, oy = Math.floor(n / cols) * cell + 5;
    for (let y = 0; y < Math.floor(img.height * s); y++) {
      for (let x = 0; x < Math.floor(img.width * s); x++) {
        const si = (Math.floor(y / s) * img.width + Math.floor(x / s)) * 4;
        const a = img.data[si + 3] / 255;
        const di = ((oy + y) * sheet.width + ox + x) * 4;
        for (let c = 0; c < 3; c++) sheet.data[di + c] = Math.round(img.data[si + c] * a + sheet.data[di + c] * (1 - a));
      }
    }
  });
  fs.writeFileSync(process.argv[pi + 1], PNG.sync.write(sheet));
  console.log(`preview: ${process.argv[pi + 1]}`);
}
