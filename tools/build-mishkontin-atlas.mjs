#!/usr/bin/env node
/**
 * Mishkontin sprite-sheet preprocessor.
 *
 * The supplied artwork (mishkontin-gameplay-v1.png, 2000x667) is a
 * presentation sheet, NOT a uniform grid:
 *   - frames have different widths/heights and rows are not aligned,
 *   - neighbouring frames touch (tails and staffs overlap the next frame),
 *   - it contains label pills ("IDLE", "RUN"...) and faint frame numbers,
 *   - HURT frames contain detached "dizzy star" pieces that belong to them.
 *
 * Slicing it with fixed frame dimensions would cut ears/tails/staffs, so this
 * script separates the frames by pixel ownership instead of rectangles:
 *
 *   1. Clear the label pills and drop the caption digits.
 *   2. Erode the opaque mask; what survives are the "bodies" (seeds), one per
 *      frame. Thin parts (tails, staffs, whiskers) disappear during erosion,
 *      which is what makes touching frames separable.
 *   3. Grow all seeds simultaneously through the opaque mask (geodesic flood
 *      fill). Each opaque pixel belongs to the body that reaches it first, so a
 *      tail stays attached to its own mouse even where it touches a neighbour.
 *   4. Detached pixels (stars, faint anti-aliased edges) go to the nearest frame.
 *   5. For every frame find a foot anchor (body centre x, lowest solid pixel
 *      near the centre) and paste the frame into a UNIFORM cell so that every
 *      anchor lands on the same point. Feet therefore stay aligned between
 *      frames and the game can use one origin and one physics-body offset.
 *
 * The art is never scaled, redrawn or distorted - pixels are only moved.
 *
 * Output (committed, loaded by the game):
 *   public/assets/characters/mishkontin/generated/mishkontin-frames.png
 *   public/assets/characters/mishkontin/generated/mishkontin-frames.json
 *
 * Usage: npm run atlas  (re-run whenever the source sheet changes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public/assets/characters/mishkontin/mishkontin-gameplay-v1.png');
const OUT_DIR = path.join(ROOT, 'public/assets/characters/mishkontin/generated');
const DEBUG_PREVIEW = process.argv.includes('--preview');

/** Sequences in reading order, exactly as labelled on the sheet. */
const ROWS = [
  { yMin: 0, yMax: 220, sequences: [['idle', 6], ['run', 9]] },
  { yMin: 220, yMax: 465, sequences: [['jump', 6], ['fall', 4], ['land', 5]] },
  { yMin: 465, yMax: 9999, sequences: [['crouch', 4], ['hurt', 5], ['turn', 6]] },
];

/** Label pills measured on the source sheet: [x0, y0, x1, y1]. */
const LABEL_PILLS = [
  [18, 4, 120, 44], // IDLE
  [817, 4, 920, 44], // RUN
  [20, 225, 132, 265], // JUMP
  [789, 229, 892, 268], // FALL
  [1373, 235, 1484, 274], // LAND
  [13, 470, 142, 509], // CROUCH
  [549, 473, 661, 513], // HURT
  [1264, 472, 1376, 511], // TURN
];
const PILL_PADDING = 4;

const MASK_ALPHA = 8; // alpha above this is "opaque" for segmentation
const SOLID_ALPHA = 128; // alpha used when searching for the feet
const SEED_EROSION = 12; // px; thin parts narrower than ~2x this vanish
const MIN_SEED_AREA = 250;
const SEED_MERGE_DX = 45; // seeds in one row closer than this are one frame
const EDGE_COST_DIVISOR = 6; // colour difference per extra step of path cost
const ALPHA_COST_DIVISOR = 3; // semi-transparent halos between frames are costly
const EDGE_BUCKETS = 192; // > max single-step cost (1 + 255/6 + 255/3)
const CAPTION_MAX_AREA = 200;
const CAPTION_ALPHA = 40;
const CAPTION_HALO = 3;
const FAINT_ATTACH_RADIUS = 3; // faint edge pixels must hug their frame
const DETACHED_ATTACH_RADIUS = 30; // solid detached bits (hurt stars)
const FOOT_SEARCH_LEFT = 35; // px around the body centre that may contain feet
const FOOT_SEARCH_RIGHT = 30;
const CELL_PADDING = 4;
const MAX_ATLAS_WIDTH = 2048;

const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H } = src;
const N = W * H;
const alpha = (i) => src.data[i * 4 + 3];
console.log(`source ${path.relative(ROOT, SRC)}: ${W}x${H}`);

// --- 1. clear label pills ---------------------------------------------------
const cleared = new Uint8Array(N);
for (const [x0, y0, x1, y1] of LABEL_PILLS) {
  for (let y = Math.max(0, y0 - PILL_PADDING); y < Math.min(H, y1 + PILL_PADDING); y++) {
    for (let x = Math.max(0, x0 - PILL_PADDING); x < Math.min(W, x1 + PILL_PADDING); x++) {
      cleared[y * W + x] = 1;
    }
  }
}

const mask = new Uint8Array(N);
for (let i = 0; i < N; i++) mask[i] = !cleared[i] && alpha(i) > MASK_ALPHA ? 1 : 0;

const NEIGHBOURS_8 = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
];

/** 8-connected component labelling of a binary image. */
function labelComponents(bin) {
  const labels = new Int32Array(N);
  const comps = [];
  const stack = [];
  for (let start = 0; start < N; start++) {
    if (!bin[start] || labels[start]) continue;
    const id = comps.length + 1;
    const pixels = [];
    labels[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      pixels.push(p);
      const px = p % W;
      const py = (p - px) / W;
      for (const [dx, dy] of NEIGHBOURS_8) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (bin[q] && !labels[q]) {
          labels[q] = id;
          stack.push(q);
        }
      }
    }
    comps.push({ id, pixels });
  }
  return { labels, comps };
}

// --- drop caption digits (small, pale, semi-transparent) --------------------
// Detected on a stricter alpha mask: at low alpha a digit's halo can touch the
// feet above it. The digit's own faint halo is dropped afterwards.
const dropped = new Uint8Array(N);
{
  const strict = new Uint8Array(N);
  for (let i = 0; i < N; i++) strict[i] = mask[i] && alpha(i) > CAPTION_ALPHA ? 1 : 0;
  const { comps } = labelComponents(strict);
  let captions = 0;
  for (const c of comps) {
    if (c.pixels.length > CAPTION_MAX_AREA) continue;
    let b = 0;
    let a = 0;
    for (const p of c.pixels) {
      b += src.data[p * 4 + 2];
      a += src.data[p * 4 + 3];
    }
    b /= c.pixels.length;
    a /= c.pixels.length;
    // Digits are pale grey (high blue); the hurt stars are yellow (low blue).
    if (b > 120 || a < 20) {
      captions++;
      for (const p of c.pixels) {
        mask[p] = 0;
        dropped[p] = 1;
      }
    }
  }
  for (let pass = 0; pass < CAPTION_HALO; pass++) {
    const grow = [];
    for (let i = 0; i < N; i++) {
      if (dropped[i] || alpha(i) > CAPTION_ALPHA) continue;
      const x = i % W;
      const y = (i - x) / W;
      if (NEIGHBOURS_8.some(([dx, dy]) => dropped[(y + dy) * W + x + dx])) grow.push(i);
    }
    for (const i of grow) {
      dropped[i] = 1;
      mask[i] = 0;
    }
  }
  console.log(`removed ${captions} caption fragments`);
}

// --- 2. seeds: erode via chessboard distance-to-background -------------------
const dist = new Int32Array(N).fill(-1);
{
  const queue = new Int32Array(N);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < N; i++) {
    if (!mask[i]) {
      dist[i] = 0;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const p = queue[head++];
    const px = p % W;
    const py = (p - px) / W;
    for (const [dx, dy] of NEIGHBOURS_8) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (dist[q] === -1) {
        dist[q] = dist[p] + 1;
        queue[tail++] = q;
      }
    }
  }
}
const seedBin = new Uint8Array(N);
for (let i = 0; i < N; i++) seedBin[i] = dist[i] >= SEED_EROSION ? 1 : 0;
const seedComps = labelComponents(seedBin).comps.filter((c) => c.pixels.length >= MIN_SEED_AREA);

function centroid(pixels) {
  let sx = 0;
  let sy = 0;
  for (const p of pixels) {
    sx += p % W;
    sy += Math.floor(p / W);
  }
  return { x: sx / pixels.length, y: sy / pixels.length };
}

// Group seeds into frames: same row band, close horizontal centres.
const frames = [];
for (const row of ROWS) {
  const inRow = seedComps
    .map((c) => ({ ...c, c: centroid(c.pixels) }))
    .filter((c) => c.c.y >= row.yMin && c.c.y < row.yMax)
    .sort((a, b) => a.c.x - b.c.x);
  const groups = [];
  for (const s of inRow) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.cx - s.c.x) < SEED_MERGE_DX) {
      last.seeds.push(s);
      const all = last.seeds.flatMap((q) => q.pixels);
      last.cx = centroid(all).x;
    } else {
      groups.push({ seeds: [s], cx: s.c.x });
    }
  }
  const expected = row.sequences.reduce((n, [, count]) => n + count, 0);
  if (groups.length !== expected) {
    throw new Error(`row y${row.yMin}: found ${groups.length} bodies, expected ${expected}`);
  }
  let g = 0;
  for (const [name, count] of row.sequences) {
    for (let k = 0; k < count; k++) {
      const group = groups[g++];
      const seedPixels = group.seeds.flatMap((q) => q.pixels);
      frames.push({ anim: name, index: k, seedPixels, body: centroid(seedPixels) });
    }
  }
}
console.log(`found ${frames.length} frames`);

// --- 3. edge-aware geodesic flood fill from seeds ---------------------------
// Dijkstra (bucket queue) through the opaque mask. A step costs more when it
// crosses a strong colour edge, so a staff spiral overlapping a neighbour's
// ear is reached along its own wooden shaft rather than through the ear, and
// crossing the semi-transparent halo between two touching frames is costly.
const owner = new Int32Array(N).fill(-1);
{
  const cost = new Int32Array(N).fill(-1);
  const buckets = Array.from({ length: EDGE_BUCKETS }, () => []);
  frames.forEach((f, fi) => {
    for (const p of f.seedPixels) {
      owner[p] = fi;
      cost[p] = 0;
      buckets[0].push(p);
    }
  });
  const d = src.data;
  let pending = buckets[0].length;
  for (let c = 0; pending > 0; c++) {
    const bucket = buckets[c % EDGE_BUCKETS];
    while (bucket.length) {
      const p = bucket.pop();
      pending--;
      if (cost[p] !== c) continue; // stale entry
      const px = p % W;
      const py = (p - px) / W;
      for (const [dx, dy] of NEIGHBOURS_8) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (!mask[q]) continue;
        const diff = Math.max(
          Math.abs(d[p * 4] - d[q * 4]),
          Math.abs(d[p * 4 + 1] - d[q * 4 + 1]),
          Math.abs(d[p * 4 + 2] - d[q * 4 + 2]),
        );
        const minAlpha = Math.min(d[p * 4 + 3], d[q * 4 + 3]);
        const nc = c + 1 + Math.floor(diff / EDGE_COST_DIVISOR) + Math.floor((255 - minAlpha) / ALPHA_COST_DIVISOR);
        if (cost[q] === -1 || nc < cost[q]) {
          cost[q] = nc;
          owner[q] = owner[p];
          buckets[nc % EDGE_BUCKETS].push(q);
          pending++;
        }
      }
    }
  }

  // --- 4. detached / faint pixels -> nearest frame (bounded BFS) -----------
  // The source has faint compression noise everywhere, so attachment is
  // limited by distance: faint pixels only right next to a frame, solid
  // detached pieces (stars) within a modest radius. Everything else is noise.
  const queue = new Int32Array(N);
  let head = 0;
  let tail = 0;
  const nearest = Int32Array.from(owner);
  const steps = new Int32Array(N);
  for (let i = 0; i < N; i++) if (nearest[i] !== -1) queue[tail++] = i;
  while (head < tail) {
    const p = queue[head++];
    if (steps[p] >= DETACHED_ATTACH_RADIUS) continue;
    const px = p % W;
    const py = (p - px) / W;
    for (const [dx, dy] of NEIGHBOURS_8) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (nearest[q] === -1) {
        nearest[q] = nearest[p];
        steps[q] = steps[p] + 1;
        queue[tail++] = q;
      }
    }
  }
  // Solid detached components are attached whole, or not at all.
  const detached = labelComponents(mask.map((m, i) => (m && owner[i] === -1 ? 1 : 0))).comps;
  for (const c of detached) {
    const reached = c.pixels.find((p) => nearest[p] !== -1);
    if (reached === undefined) continue;
    for (const p of c.pixels) owner[p] = nearest[reached];
  }
  for (let i = 0; i < N; i++) {
    if (owner[i] !== -1 || alpha(i) === 0 || cleared[i] || dropped[i]) continue;
    if (nearest[i] !== -1 && steps[i] <= FAINT_ATTACH_RADIUS) owner[i] = nearest[i];
  }
}

// --- 5. per-frame bounds and foot anchor ------------------------------------
for (const f of frames) {
  f.minX = W;
  f.minY = H;
  f.maxX = -1;
  f.maxY = -1;
}
for (let i = 0; i < N; i++) {
  const fi = owner[i];
  if (fi === -1) continue;
  const f = frames[fi];
  const x = i % W;
  const y = (i - x) / W;
  if (x < f.minX) f.minX = x;
  if (x > f.maxX) f.maxX = x;
  if (y < f.minY) f.minY = y;
  if (y > f.maxY) f.maxY = y;
}
frames.forEach((f, fi) => {
  f.anchorX = Math.round(f.body.x);
  f.anchorY = -1;
  for (let y = f.maxY; y >= f.minY && f.anchorY === -1; y--) {
    for (let x = f.anchorX - FOOT_SEARCH_LEFT; x <= f.anchorX + FOOT_SEARCH_RIGHT; x++) {
      const i = y * W + x;
      if (owner[i] === fi && alpha(i) >= SOLID_ALPHA) {
        f.anchorY = y;
        break;
      }
    }
  }
});

// Uniform cell: symmetric around the anchor so flipX keeps the feet in place.
const halfW = Math.max(...frames.map((f) => Math.max(f.anchorX - f.minX, f.maxX - f.anchorX))) + CELL_PADDING;
const above = Math.max(...frames.map((f) => f.anchorY - f.minY)) + CELL_PADDING;
const below = Math.max(...frames.map((f) => f.maxY - f.anchorY)) + CELL_PADDING;
const cellW = halfW * 2 + 1;
const cellH = above + below + 1;
const cols = Math.min(frames.length, Math.floor(MAX_ATLAS_WIDTH / cellW));
const rowsOut = Math.ceil(frames.length / cols);
const out = new PNG({ width: cols * cellW, height: rowsOut * cellH });
out.data.fill(0);

frames.forEach((f, fi) => {
  const ox = (fi % cols) * cellW + halfW - f.anchorX;
  const oy = Math.floor(fi / cols) * cellH + above - f.anchorY;
  for (let y = f.minY; y <= f.maxY; y++) {
    for (let x = f.minX; x <= f.maxX; x++) {
      const i = y * W + x;
      if (owner[i] !== fi) continue;
      const o = ((oy + y) * out.width + (ox + x)) * 4;
      src.data.copy(out.data, o, i * 4, i * 4 + 4);
    }
  }
});

fs.mkdirSync(OUT_DIR, { recursive: true });
const pngPath = path.join(OUT_DIR, 'mishkontin-frames.png');
fs.writeFileSync(pngPath, PNG.sync.write(out, { colorType: 6, deflateLevel: 9 }));

const animations = {};
frames.forEach((f, fi) => {
  (animations[f.anim] ??= []).push(fi);
});
const manifest = {
  generatedBy: 'tools/build-mishkontin-atlas.mjs',
  source: 'mishkontin-gameplay-v1.png',
  frameWidth: cellW,
  frameHeight: cellH,
  columns: cols,
  // Foot anchor inside every cell, in pixels and as a Phaser origin.
  anchor: { x: halfW, y: above, originX: halfW / cellW, originY: above / cellH },
  animations,
  sourceRects: frames.map((f) => ({
    anim: f.anim,
    index: f.index,
    x: f.minX,
    y: f.minY,
    w: f.maxX - f.minX + 1,
    h: f.maxY - f.minY + 1,
    footX: f.anchorX,
    footY: f.anchorY,
  })),
};
fs.writeFileSync(path.join(OUT_DIR, 'mishkontin-frames.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`cell ${cellW}x${cellH}, anchor (${halfW}, ${above}), atlas ${out.width}x${out.height}, ${cols} columns`);
console.log(`wrote ${path.relative(ROOT, pngPath)} (${(fs.statSync(pngPath).size / 1024).toFixed(0)} KB)`);

if (DEBUG_PREVIEW) {
  // Ownership preview: every frame tinted a different colour.
  const prev = new PNG({ width: W, height: H });
  const palette = [[255, 80, 80], [80, 200, 255], [255, 220, 60], [140, 255, 120], [220, 120, 255]];
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (owner[i] === -1) {
      prev.data[o + 3] = 255;
      prev.data[o] = prev.data[o + 1] = prev.data[o + 2] = 30;
      continue;
    }
    const [r, g, b] = palette[owner[i] % palette.length];
    prev.data[o] = (src.data[o] + r) >> 1;
    prev.data[o + 1] = (src.data[o + 1] + g) >> 1;
    prev.data[o + 2] = (src.data[o + 2] + b) >> 1;
    prev.data[o + 3] = 255;
  }
  for (const f of frames) {
    for (let d = -6; d <= 6; d++) {
      for (const [x, y] of [[f.anchorX + d, f.anchorY], [f.anchorX, f.anchorY + d]]) {
        const o = (y * W + x) * 4;
        prev.data[o] = 255;
        prev.data[o + 1] = prev.data[o + 2] = 0;
      }
    }
  }
  const previewPath = process.argv[process.argv.indexOf('--preview') + 1] ?? 'atlas-preview.png';
  fs.writeFileSync(previewPath, PNG.sync.write(prev));
  console.log(`wrote ownership preview ${previewPath}`);
}
