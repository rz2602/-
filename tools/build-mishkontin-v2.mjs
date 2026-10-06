#!/usr/bin/env node
/**
 * Mishkontin V2 high-resolution animation set -> runtime atlas.
 *
 * Masters: art/masters/characters/mishkontin_v2/** (never modified; SHA-256
 * verified against art/masters/MANIFEST.json).
 *
 *   1. Alpha check: every sheet must have a real alpha channel with
 *      transparent corners (a baked background stops the build).
 *   2. Slicing: frames are separated by a minimum-cost vertical SEAM per gap
 *      (dynamic programming through the transparent space between poses), not
 *      by equal cells - the sheets are not uniform and some poses overlap.
 *      Detached parts (Z symbols, reaction marks, the map, the staff) stay
 *      with the frame whose region they are in.
 *   3. Measurement per frame: fur centroid, feet =
 *      lowest row with real coverage, character scale = size of the pink ears
 *      (upper half of the frame) - the sheets were drawn at different sizes.
 *   4. Normalization: ONE character scale. Each sheet gets a single factor
 *      (idle ear size / sheet ear size, plus a documented manual correction
 *      where the ear proxy misreads a pose) so Mishkontin is the same size in
 *      every animation; frames are never scaled individually or stretched.
 *   5. Anchors: grounded frames sit on their feet (bottom-centre contact);
 *      horizontally they use the fur centroid, or for BODY_ANCHOR sheets (the
 *      run) the upper-body centre (head + torso landmarks). Airborne frames keep
 *      the body centre at the same height above the physics feet as in idle.
 *      All frames share one cell and carry a pivot at the anchor, so Phaser's
 *      origin is constant and flipX mirrors around the anchor.
 *   6. Runtime: frames downscaled (Lanczos) to RUNTIME_PX_PER_LOGICAL, runtime
 *      alpha cleanup (>=240 -> 255, <4 -> 0), packed into ONE trimmed atlas,
 *      lossless WebP (verified identical on visible pixels).
 *
 * Output:
 *   public/assets/characters/mishkontin/v2/mishkontin-v2.webp + .json (Phaser atlas)
 *   public/assets/characters/mishkontin/v2/mishkontin-v2-manifest.json (anchor, cell, scale, frames)
 *   art/masters/characters/mishkontin_v2/CHARACTER_V2_MANIFEST.json (source audit + slicing)
 *
 * Usage: npm run mishkontin-v2
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = path.join(ROOT, 'art/masters');
const SRC = 'characters/mishkontin_v2';
const OUT_DIR = path.join(ROOT, 'public/assets/characters/mishkontin/v2');

/** Idle standing height on screen (logical px, ears/staff included). Legacy idle: ~129. */
const TARGET_IDLE_HEIGHT = 150;
/** Runtime texture px per logical px: 2 = 100 % at 2560x1440, 150 % at 4K. */
const RUNTIME_PX_PER_LOGICAL = 2;
const ATLAS_MAX = 4096;
const PADDING = 2;
const SOLID_ALPHA = 240;
const SPECK_ALPHA = 4;

/**
 * Frame counts verified by inspection (three file names do not match their
 * sheets: run has 8, crouch 4, wave 6). `air`: frame indices whose anchor is
 * the body centre instead of the feet. `scaleAdjust`: manual correction of the
 * automatic ear-size scale where the ears are foreshortened by the pose.
 */
const SHEETS = [
  { name: 'idle', file: 'idle/mishkontin_idle_v2_6frames.png', frames: 6, kind: 'core' },
  // 12-frame run master (2 rows x 6, numbered labels, opaque black background, lossy WebP at
  // runtime resolution). `bands`: the two character rows; the labels lie outside them.
  // `ground: 'band'`: frames are grounded on their row's ground line (keeps the flight phase).
  // `matte`: black background -> alpha (see matteBlackBackground). `maxUpscale`: the master is
  // at the runtime scale already, so it is used 1:1 (never resampled) within this tolerance.
  {
    name: 'run', file: 'run/mishkontin_run_v2_12frames_master.webp', frames: 12, kind: 'core',
    bands: [[52, 338], [380, 667]], ground: 'band', matte: { threshold: 14 }, maxUpscale: 1.03,
  },
  { name: 'jump', file: 'jump/mishkontin_jump_v2_6frames.png', frames: 6, kind: 'core', air: [1, 2, 3, 4] },
  { name: 'fall', file: 'fall/mishkontin_fall_v2_6frames.png', frames: 6, kind: 'core', air: [0, 1, 2] },
  { name: 'land', file: 'land/mishkontin_land_v2_6frames.png', frames: 6, kind: 'core', air: [0, 1, 2] },
  { name: 'crouch', file: 'crouch/mishkontin_crouch_v2_4frames.png', frames: 4, kind: 'core' },
  { name: 'hurt', file: 'hurt/mishkontin_hurt_v2_5frames.png', frames: 5, kind: 'core', scaleAdjust: 0.86 },
  { name: 'turn', file: 'turn/mishkontin_turn_v2_6frames.png', frames: 6, kind: 'core' },
  { name: 'blink', file: 'personality/blink/blink_v2_4frames.png', frames: 4, kind: 'personality' },
  { name: 'wave', file: 'personality/wave/wave_v2_6frames.png', frames: 6, kind: 'personality' },
  { name: 'surprised', file: 'personality/surprised/surprised_v2_4frames.png', frames: 4, kind: 'personality' },
  { name: 'read_map', file: 'personality/read_map/read_map_v2_6frames.png', frames: 6, kind: 'personality' },
  { name: 'sit', file: 'personality/sit/sit_v2_6frames.png', frames: 6, kind: 'personality', scaleAdjust: 0.92 },
  { name: 'sleep', file: 'personality/sleep/sleep_v2_4frames.png', frames: 4, kind: 'personality', scaleAdjust: 0.75 },
];

/**
 * Horizontal anchor of grounded frames, per sheet.
 *   'fur' (default): centroid of fur-coloured pixels. Swinging legs and arms
 *     are fur too, so on the run this shifted the whole body against every leg
 *     swing (torso jitter up to 9.5 logical px between frames).
 *   'body': upper-body centre = midpoint of the head (pupil) and the torso
 *     (gold medallion), both found automatically by template matching against
 *     ONE character reference (idle frame 0). The upper-body centre IS the
 *     anchor: it sits on the physics anchor (the mirror axis for flipX), so the
 *     head and torso stay in the same world position when facing left or right,
 *     centred on the collision body.
 *     No per-frame manual offsets. The head and torso of the run art do not
 *     move together (the head nods ~8 px), so locking either one alone leaves
 *     the other at full jitter; the midpoint halves both.
 * Vertical anchoring is unchanged (feet / airborne body centre).
 * Only the run uses 'body' for now; jump, fall and land are deliberately untouched.
 */
const BODY_ANCHOR = {
  sheets: ['run'],
  /** Reference landmarks in idle frame 0, master px relative to the frame's crop box. */
  reference: { sheet: 'idle', frame: 0, eye: [227.8, 87.5], medallion: [236.0, 199.8] },
  /** Share of the head in the upper-body centre (0 = torso only). */
  headWeight: 0.5,
  /** Template half-sizes and minimum match scores (runtime px; normalized cross-correlation). */
  eyeHalf: 16,
  medallionHalf: 9,
  minEyeScore: 0.6,
  minMedallionScore: 0.45,
};

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

const masterManifest = JSON.parse(fs.readFileSync(path.join(MASTERS, 'MANIFEST.json'), 'utf8'));
const checksums = new Map(masterManifest.masters.map((m) => [m.master, m.sha256]));

/** Minimum-cost top-to-bottom path (one step left/right per row) near column c. */
function seam(img, c, half) {
  const { width: W, height: H, data } = img;
  const lo = Math.max(0, Math.round(c - half));
  const hi = Math.min(W, Math.round(c + half));
  const w = hi - lo;
  const cost = (x, y) => {
    const a = data[(y * W + lo + x) * 4 + 3];
    return (a > 8 ? 1000 : 0) + a / 255;
  };
  let acc = new Float64Array(w);
  for (let x = 0; x < w; x++) acc[x] = cost(x, 0);
  const back = new Int8Array(w * H);
  for (let y = 1; y < H; y++) {
    const next = new Float64Array(w);
    for (let x = 0; x < w; x++) {
      let best = acc[x], k = 0;
      if (x > 0 && acc[x - 1] < best) { best = acc[x - 1]; k = -1; }
      if (x < w - 1 && acc[x + 1] < best) { best = acc[x + 1]; k = 1; }
      next[x] = best + cost(x, y);
      back[y * w + x] = k;
    }
    acc = next;
  }
  let x = 0;
  for (let i = 1; i < w; i++) if (acc[i] < acc[x]) x = i;
  const pathX = new Int32Array(H);
  let crossed = 0;
  for (let y = H - 1; y >= 0; y--) {
    pathX[y] = x + lo;
    if (data[(y * W + x + lo) * 4 + 3] > 8) crossed++;
    x += back[y * w + x];
  }
  return { pathX, crossed };
}

/** Frame `i`: pixels between seams i and i+1, cropped to their visible bounds, plus measurements. */
function extractFrame(img, left, right) {
  const { width: W, height: H, data } = img;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = left[y]; x < right[y]; x++) {
      if (data[(y * W + x) * 4 + 3] > 2) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const px = Buffer.alloc(w * h * 4);
  let furN = 0, furX = 0, furY = 0, pink = 0;
  const rowCover = new Int32Array(h);
  for (let y = y0; y <= y1; y++) {
    for (let x = Math.max(x0, left[y]); x < Math.min(x1 + 1, right[y]); x++) {
      const s = (y * W + x) * 4;
      const d = ((y - y0) * w + (x - x0)) * 4;
      const [r, g, b, a] = [data[s], data[s + 1], data[s + 2], data[s + 3]];
      px[d] = r; px[d + 1] = g; px[d + 2] = b; px[d + 3] = a;
      if (a > 150) rowCover[y - y0]++;
      if (a <= 200) continue;
      if (r > 150 && g > 70 && g < 170 && b < 110 && r - g > 40) { furN++; furX += x - x0; furY += y - y0; }
      if (y - y0 < h * 0.5 && r > 200 && g > 90 && g < 175 && b > 100 && b < 200 && r - g > 60) pink++;
    }
  }
  let feet = h - 1;
  while (feet > 0 && rowCover[feet] < 0.02 * w) feet--;
  // No fur-coloured pixels (other palette): fall back to the box centre.
  return { data: px, width: w, height: h, box: [x0, y0, x1, y1], furX: furN ? furX / furN : w / 2, furY: furN ? furY / furN : h / 2, ear: Math.sqrt(pink), feet: feet + 1 };
}

// ------------------------------------------------- body landmarks (runtime) ---
/** Luminance composited on mid grey (transparent = 128), so silhouettes match too. */
function greyOf(f) {
  const g = new Float32Array(f.w * f.h);
  for (let i = 0; i < g.length; i++) {
    const a = f.data[i * 4 + 3] / 255;
    g[i] = ((f.data[i * 4] + f.data[i * 4 + 1] + f.data[i * 4 + 2]) / 3) * a + 128 * (1 - a);
  }
  return g;
}

function patchOf(g, w, cx, cy, half) {
  const n = half * 2;
  const t = new Float32Array(n * n);
  const x0 = Math.round(cx) - half, y0 = Math.round(cy) - half;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) t[y * n + x] = g[(y0 + y) * w + x0 + x];
  return { t, n };
}

/** Best normalized cross-correlation of template `p` in region [x0,x1)x[y0,y1) (template centres). */
function matchTemplate(g, w, h, p, x0, y0, x1, y1, accept = null) {
  const { t, n } = p;
  const half = n / 2;
  let tm = 0;
  for (const v of t) tm += v;
  tm /= t.length;
  let tv = 0;
  for (const v of t) tv += (v - tm) ** 2;
  let best = { score: -2, x: 0, y: 0 };
  for (let cy = Math.max(half, y0); cy < Math.min(h - half, y1); cy++) {
    for (let cx = Math.max(half, x0); cx < Math.min(w - half, x1); cx++) {
      let s = 0, s2 = 0, st = 0;
      for (let y = 0; y < n; y++) {
        const row = (cy - half + y) * w + cx - half;
        for (let x = 0; x < n; x++) {
          const v = g[row + x];
          s += v; s2 += v * v; st += v * (t[y * n + x] - tm);
        }
      }
      if (accept && !accept(cx, cy)) continue;
      const variance = s2 - (s * s) / t.length;
      if (variance / t.length < 25) continue; // flat area (background): no texture to match
      const score = st / Math.sqrt(variance * tv);
      if (score > best.score) best = { score, x: cx, y: cy };
    }
  }
  return best;
}

/** Centroid of pixels passing `test` within `rad` of p (sub-pixel landmark), else p. */
function refineLandmark(f, p, rad, test) {
  let n = 0, sx = 0, sy = 0;
  for (let y = Math.max(0, p.y - rad); y < Math.min(f.h, p.y + rad); y++) {
    for (let x = Math.max(0, p.x - rad); x < Math.min(f.w, p.x + rad); x++) {
      const i = (y * f.w + x) * 4;
      if (test(f.data[i], f.data[i + 1], f.data[i + 2], f.data[i + 3])) { n++; sx += x; sy += y; }
    }
  }
  return n >= 5 ? { x: sx / n, y: sy / n } : { x: p.x, y: p.y };
}
const isPupil = (r, g, b, a) => a > 200 && r + g + b < 110;
const isGold = (r, g, b, a) => a > 200 && r > 170 && g > 120 && b < 100 && g / Math.max(r, 1) > 0.62;

/**
 * Head (pupil) and torso (medallion) of every frame of `frames`. Pass 1 uses the
 * idle reference; pass 2 re-searches both with the sheet's own best match as
 * template. The torso search is limited
 * to the chest area below the head found first (belt and satchel buckles are gold too).
 */
function findBodyLandmarks(frames, refEye, refMedallion) {
  const cfg = BODY_ANCHOR;
  const find = (f, g, eyeTemplate, medallionTemplate) => {
    const eyeHit = matchTemplate(g, f.w, f.h, eyeTemplate, 0, 0, f.w, Math.round(f.h * 0.75));
    const eye = refineLandmark(f, eyeHit, 10, isPupil);
    const ex = Math.round(eye.x), ey = Math.round(eye.y);
    // Only gold-centred positions: the cloak collar and fur next to it can match the template shape.
    const goldCentre = (cx, cy) => {
      let gold = 0;
      for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
        const i = (y * f.w + x) * 4;
        if (isGold(f.data[i], f.data[i + 1], f.data[i + 2], f.data[i + 3])) gold++;
      }
      return gold >= 13;
    };
    const mHit = matchTemplate(g, f.w, f.h, medallionTemplate, ex - 75, ey + 20, ex + 30, ey + 120, goldCentre);
    const medallion = refineLandmark(f, mHit, cfg.medallionHalf, isGold);
    return { eye, eyeScore: eyeHit.score, medallion, medallionScore: mHit.score };
  };
  const greys = frames.map(greyOf);
  // Pass 1: the idle reference. Pass 2: the sheet's own best match as template for both
  // landmarks (a new art set can draw the eye and medallion a little differently).
  const pass1 = frames.map((f, i) => find(f, greys[i], refEye, refMedallion));
  const best = pass1.reduce((b, r, i) => (r.eyeScore + r.medallionScore > pass1[b].eyeScore + pass1[b].medallionScore ? i : b), 0);
  const ownEye = patchOf(greys[best], frames[best].w, pass1[best].eye.x, pass1[best].eye.y, cfg.eyeHalf);
  const ownMedallion = patchOf(greys[best], frames[best].w, pass1[best].medallion.x, pass1[best].medallion.y, cfg.medallionHalf);
  return frames.map((f, i) => find(f, greys[i], ownEye, ownMedallion));
}

/**
 * Opaque black background -> alpha, for a master delivered without transparency.
 *   - Background = near-black pixels (max channel <= threshold, which also covers
 *     the lossy-compression noise) connected to the image border; dark areas
 *     enclosed by the character (pupils) stay opaque.
 *   - Edge pixels (within 2 px of the background) were blended with black when
 *     rendered: alpha = their brightness relative to the solid colour 3-4 px
 *     inside, and the colour is un-blended (divided by alpha). No dark fringe.
 */
function matteBlackBackground(img, threshold) {
  const { width: W, height: H, data } = img;
  const n = W * H;
  const dark = new Uint8Array(n);
  for (let i = 0; i < n; i++) dark[i] = Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) <= threshold ? 1 : 0;
  // Flood fill the background from the border (4-connected).
  const bg = new Uint8Array(n);
  const stack = [];
  const push = (i) => { if (dark[i] && !bg[i]) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(); const x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W);
  }
  // Dark areas enclosed by the character, measured on the master:
  //   gaps (background seen between staff, arm and legs): pure black (mean 3.8-5.6) inside lit
  //     edges (median of the 2 px ring 36-50), 250-1050 px;
  //   cloak/satchel shadow: mean 8-11 inside a dark shading gradient (ring median 17-23);
  //   pupils: 57-80 px, inside the eye.
  // Gaps become background; so do small dark specks touching the background (whisker gaps).
  const maxc = (i) => Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  const seen = new Uint8Array(n);
  const pockets = [];
  for (let s0 = 0; s0 < n; s0++) {
    if (!dark[s0] || bg[s0] || seen[s0]) continue;
    const comp = [s0]; seen[s0] = 1;
    for (let c = 0; c < comp.length; c++) {
      const i = comp[c]; const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && dark[j] && !bg[j] && !seen[j]) { seen[j] = 1; comp.push(j); }
      }
    }
    pockets.push(comp);
  }
  const inComp = new Int32Array(n).fill(-1);
  pockets.forEach((comp, k) => { for (const i of comp) inComp[i] = k; });
  for (const [k, comp] of pockets.entries()) {
    let mean = 0;
    for (const i of comp) mean += maxc(i);
    mean /= comp.length;
    const ring = [];
    let touchesBackground = false;
    for (const i of comp) {
      const x = i % W, y = (i / W) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (inComp[j] === k) continue;
        if (bg[j]) touchesBackground = true;
        else ring.push(maxc(j));
      }
    }
    ring.sort((p, q) => p - q);
    const ringMedian = ring.length ? ring[ring.length >> 1] : 0;
    const gap = comp.length >= 100 && mean <= 6.5 && ringMedian >= 30;
    const speck = comp.length < 100 && touchesBackground;
    if (gap || speck) for (const i of comp) bg[i] = 1;
  }
  // Distance (in px, chessboard, up to 5) from the background.
  const dist = new Uint8Array(n).fill(255);
  let front = [];
  for (let i = 0; i < n; i++) if (bg[i]) { dist[i] = 0; front.push(i); }
  for (let d = 1; d <= 5; d++) {
    const next = [];
    for (const i of front) {
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (dist[j] === 255) { dist[j] = d; next.push(j); }
      }
    }
    front = next;
  }
  const out = Buffer.from(data);
  const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  for (let i = 0; i < n; i++) {
    if (bg[i]) { out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = out[i * 4 + 3] = 0; continue; }
    out[i * 4 + 3] = 255;
    if (dist[i] > 2) continue;
    // Solid colour nearby: mean of pixels 3-4 px inside within a 4 px radius.
    const x = i % W, y = (i / W) | 0;
    let sr = 0, sg = 0, sb = 0, k = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx;
      if (dist[j] >= 3 && dist[j] <= 4) { sr += data[j * 4]; sg += data[j * 4 + 1]; sb += data[j * 4 + 2]; k++; }
    }
    // Thin structures (whiskers, hair tips) have no solid core nearby: un-blend them against
    // black by their own brightness (a lit fur tone ~160 is opaque), so dark whisker strokes
    // drawn over the black background become faint instead of black scribbles.
    const solid = k ? lum(sr / k, sg / k, sb / k) : 160;
    const a = Math.min(1, lum(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) / Math.max(solid, 1));
    out[i * 4 + 3] = Math.round(a * 255);
    if (a > 0) for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, Math.round(data[i * 4 + c] / a));
  }
  return { data: out, width: W, height: H };
}

/** Horizontal band [y0, y1) of an RGBA image. */
function cropRows(img, y0, y1) {
  return { data: Buffer.from(img.data.subarray(y0 * img.width * 4, y1 * img.width * 4)), width: img.width, height: y1 - y0 };
}

/** Frames of one row of poses, separated by seams (see seam()). */
function sliceRow(img, count) {
  const { width: W, height: H, data } = img;
  let first = W, last = 0;
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (data[(y * W + x) * 4 + 3] > 100) { first = Math.min(first, x); last = Math.max(last, x); break; }
    }
  }
  const cell = (last + 1 - first) / count;
  const bounds = [new Int32Array(H).fill(0)];
  const crossed = [];
  for (let i = 1; i < count; i++) {
    const s = seam(img, first + i * cell, 0.3 * cell);
    bounds.push(s.pathX);
    crossed.push(s.crossed);
  }
  bounds.push(new Int32Array(H).fill(W));
  const frames = [];
  for (let i = 0; i < count; i++) frames.push(extractFrame(img, bounds[i], bounds[i + 1]));
  return { frames, crossed };
}

function cleanupAlpha(buf) {
  for (let i = 3; i < buf.length; i += 4) {
    const a = buf[i];
    if (a >= SOLID_ALPHA) buf[i] = 255;
    else if (a > 0 && a < SPECK_ALPHA) { buf[i] = 0; buf[i - 1] = buf[i - 2] = buf[i - 3] = 0; }
  }
}

// ---------------------------------------------------------------- slicing ---
const sheets = [];
for (const sheet of SHEETS) {
  const rel = `${SRC}/${sheet.file}`;
  const file = path.join(MASTERS, rel);
  if (checksums.get(rel) !== sha256(file)) throw new Error(`${rel}: master checksum mismatch - masters must not change`);
  const meta = await sharp(file).metadata();
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let img = { data, width: info.width, height: info.height };
  if (sheet.matte) {
    if (meta.hasAlpha) throw new Error(`${rel}: has alpha but is configured for the black-background matte`);
    img = matteBlackBackground(img, sheet.matte.threshold);
  } else if (!meta.hasAlpha) throw new Error(`${rel}: no alpha channel - BLOCKED`);
  for (const [cx, cy] of [[0, 0], [img.width - 1, 0], [0, img.height - 1], [img.width - 1, img.height - 1]]) {
    if (img.data[(cy * img.width + cx) * 4 + 3] > 10) throw new Error(`${rel}: opaque corner - baked background? BLOCKED`);
  }
  // One row of poses, or several bands (rows) read left to right, top to bottom.
  const rows = sheet.bands ? sheet.bands.map(([y0, y1]) => cropRows(img, y0, y1)) : [img];
  if (sheet.frames % rows.length) throw new Error(`${rel}: ${sheet.frames} frames do not split into ${rows.length} rows`);
  const frames = [];
  const crossed = [];
  for (const [r, row] of rows.entries()) {
    const sliced = sliceRow(row, sheet.frames / rows.length);
    // Frame boxes in sheet coordinates.
    const y0 = sheet.bands ? sheet.bands[r][0] : 0;
    for (const f of sliced.frames) f.box = [f.box[0], f.box[1] + y0, f.box[2], f.box[3] + y0];
    // Ground line of the row: the poses were drawn standing on one line, and the flight
    // poses lift both feet above it. Grounding every frame on its own lowest foot would pull
    // those down and double the head bob, so all frames of a row share the row's ground line.
    if (sheet.ground === 'band') {
      const ground = Math.max(...sliced.frames.map((f) => f.box[1] + f.feet));
      for (const f of sliced.frames) f.feet = ground - f.box[1];
    }
    frames.push(...sliced.frames);
    crossed.push(...sliced.crossed);
  }
  sheets.push({ ...sheet, rel, size: [img.width, img.height], crossed, frames, sha: checksums.get(rel) });
  console.log(`${sheet.name.padEnd(10)} ${sheet.frames} frames, seam opaque crossings ${JSON.stringify(crossed)}`);
}

// ---------------------------------------------------------- normalization ---
const idle = sheets.find((s) => s.name === 'idle');
const earRef = median(idle.frames.map((f) => f.ear));
const base = (TARGET_IDLE_HEIGHT * RUNTIME_PX_PER_LOGICAL) / median(idle.frames.map((f) => f.height));
// Body centre height above the feet in idle (runtime px), used for airborne frames.
const bodyAboveFeet = median(idle.frames.map((f) => f.feet - f.furY)) * base;

const runtime = [];
for (const sheet of sheets) {
  sheet.scale = base * (earRef / median(sheet.frames.map((f) => f.ear))) * (sheet.scaleAdjust ?? 1);
  if (sheet.scale > 1 && sheet.scale <= (sheet.maxUpscale ?? 1)) {
    console.log(`  ${sheet.name.padEnd(10)} measured scale ${sheet.scale.toFixed(4)}: master is at runtime resolution, used 1:1 (not resampled)`);
    sheet.measuredScale = sheet.scale;
    sheet.scale = 1;
  }
  if (sheet.scale > 1) throw new Error(`${sheet.name}: would be upscaled (${sheet.scale})`);
  for (const [i, f] of sheet.frames.entries()) {
    const w = Math.max(1, Math.round(f.width * sheet.scale));
    const h = Math.max(1, Math.round(f.height * sheet.scale));
    const data = sheet.scale === 1 ? Buffer.from(f.data) : await sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
      .resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer();
    cleanupAlpha(data);
    const air = sheet.air?.includes(i) ?? false;
    const anchorX = f.furX * sheet.scale;
    const anchorY = air ? f.furY * sheet.scale + bodyAboveFeet : f.feet * sheet.scale;
    runtime.push({ name: `${sheet.name}_${i}`, sheet: sheet.name, data, w, h, anchorX, anchorY, air });
  }
}

// Body anchor (see BODY_ANCHOR): the upper-body centre is the anchor.
{
  const refSheet = sheets.find((s) => s.name === BODY_ANCHOR.reference.sheet);
  const refSrc = refSheet.frames[BODY_ANCHOR.reference.frame];
  const ref = runtime.find((f) => f.name === `${refSheet.name}_${BODY_ANCHOR.reference.frame}`);
  const k = ref.w / refSrc.width;
  const refGrey = greyOf(ref);
  const [eX, eY] = BODY_ANCHOR.reference.eye;
  const [mX, mY] = BODY_ANCHOR.reference.medallion;
  const refEye = patchOf(refGrey, ref.w, eX * k, eY * k, BODY_ANCHOR.eyeHalf);
  const refMedallion = patchOf(refGrey, ref.w, mX * k, mY * k, BODY_ANCHOR.medallionHalf);
  for (const sheet of sheets) {
    if (!BODY_ANCHOR.sheets.includes(sheet.name)) continue;
    const frames = runtime.filter((f) => f.sheet === sheet.name && !f.air);
    const marks = findBodyLandmarks(frames, refEye, refMedallion);
    const ok = marks.map((m) => m.eyeScore >= BODY_ANCHOR.minEyeScore && m.medallionScore >= BODY_ANCHOR.minMedallionScore);
    const bodyX = marks.map((m) => m.medallion.x * (1 - BODY_ANCHOR.headWeight) + m.eye.x * BODY_ANCHOR.headWeight);
    const used = frames.filter((_, i) => ok[i]);
    frames.forEach((f, i) => {
      f.landmarks = { eye: [round(marks[i].eye.x, 1), round(marks[i].eye.y, 1)], eyeScore: round(marks[i].eyeScore, 2), medallion: [round(marks[i].medallion.x, 1), round(marks[i].medallion.y, 1)], medallionScore: round(marks[i].medallionScore, 2) };
      if (!ok[i]) {
        f.anchorMethod = 'fur (body landmarks not found)';
        console.warn(`  WARNING ${f.name}: head/torso not found (scores ${f.landmarks.eyeScore}/${f.landmarks.medallionScore}); fur centroid kept`);
        return;
      }
      f.anchorX = bodyX[i];
      f.anchorMethod = 'body';
    });
    sheet.bodyAnchored = used.length;
    console.log(`  ${sheet.name.padEnd(10)} body anchor: ${used.length}/${frames.length} frames`);
  }
}

// Shared cell: every frame placed so its anchor lands on (AX, AY).
const AX = Math.ceil(Math.max(...runtime.map((f) => f.anchorX)));
const AY = Math.ceil(Math.max(...runtime.map((f) => f.anchorY)));
const CW = AX + Math.ceil(Math.max(...runtime.map((f) => f.w - f.anchorX)));
const CH = AY + Math.ceil(Math.max(...runtime.map((f) => f.h - f.anchorY)));

// ----------------------------------------------------------------- packing ---
const order = [...runtime].sort((a, b) => b.h - a.h || b.w - a.w);
let x = PADDING, y = PADDING, shelf = 0, usedW = 0;
for (const f of order) {
  if (x + f.w + PADDING > ATLAS_MAX) { x = PADDING; y += shelf + PADDING; shelf = 0; }
  f.x = x; f.y = y;
  x += f.w + PADDING;
  shelf = Math.max(shelf, f.h);
  usedW = Math.max(usedW, x);
}
const atlasW = usedW;
const atlasH = y + shelf + PADDING;
if (atlasH > ATLAS_MAX) throw new Error(`atlas ${atlasW}x${atlasH} exceeds ${ATLAS_MAX}`);
const atlas = Buffer.alloc(atlasW * atlasH * 4);
for (const f of runtime) {
  for (let r = 0; r < f.h; r++) f.data.copy(atlas, ((f.y + r) * atlasW + f.x) * 4, r * f.w * 4, (r + 1) * f.w * 4);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const imageFile = path.join(OUT_DIR, 'mishkontin-v2.webp');
await sharp(atlas, { raw: { width: atlasW, height: atlasH, channels: 4 } }).webp({ lossless: true, effort: 6 }).toFile(imageFile);
const back = (await sharp(imageFile).ensureAlpha().raw().toBuffer());
for (let i = 0; i < atlas.length; i += 4) {
  if (back[i + 3] !== atlas[i + 3] || (atlas[i + 3] > 0 && (back[i] !== atlas[i] || back[i + 1] !== atlas[i + 1] || back[i + 2] !== atlas[i + 2]))) {
    throw new Error('lossless WebP round-trip is not identical on visible pixels');
  }
}

const atlasJson = {
  frames: Object.fromEntries(runtime.map((f) => [f.name, {
    frame: { x: f.x, y: f.y, w: f.w, h: f.h },
    rotated: false,
    trimmed: true,
    spriteSourceSize: { x: Math.round(AX - f.anchorX), y: Math.round(AY - f.anchorY), w: f.w, h: f.h },
    sourceSize: { w: CW, h: CH },
    // Custom pivot = the shared anchor. Phaser mirrors a flipped frame around its pivot;
    // without one it mirrors around the frame centre, which drew Mishkontin facing left
    // 25.5 logical px away from his anchor and body.
    pivot: { x: AX / CW, y: AY / CH },
  }])),
  meta: { app: 'tools/build-mishkontin-v2.mjs', image: 'mishkontin-v2.webp', size: { w: atlasW, h: atlasH }, scale: '1' },
};
fs.writeFileSync(path.join(OUT_DIR, 'mishkontin-v2.json'), JSON.stringify(atlasJson) + '\n');

const runtimeManifest = {
  generatedBy: 'tools/build-mishkontin-v2.mjs',
  runtimePxPerLogical: RUNTIME_PX_PER_LOGICAL,
  targetIdleHeight: TARGET_IDLE_HEIGHT,
  cell: { width: CW, height: CH },
  anchor: { x: AX, y: AY, originX: round(AX / CW), originY: round(AY / CH) },
  flip: 'frames carry a pivot at the anchor, so flipX mirrors around the anchor',
  animations: Object.fromEntries(sheets.map((s) => [s.name, s.frames.map((_, i) => `${s.name}_${i}`)])),
};
fs.writeFileSync(path.join(OUT_DIR, 'mishkontin-v2-manifest.json'), JSON.stringify(runtimeManifest, null, 2) + '\n');

const sourceManifest = {
  note: 'Mishkontin V2 source audit + slicing record. Generated by tools/build-mishkontin-v2.mjs; masters are never modified.',
  normalization: { targetIdleHeightLogical: TARGET_IDLE_HEIGHT, runtimePxPerLogical: RUNTIME_PX_PER_LOGICAL, scaleReference: 'pink ear size (upper half of frame), idle median', anchorPolicy: 'grounded: feet (lowest covered row) + x per sheet (body = midpoint of head pupil and torso medallion, matched against idle frame 0, the upper-body centre is the anchor (mirror axis, centred on the collision body); fur = fur centroid); airborne: fur centroid, body centre held at idle height above the feet', bodyAnchor: { sheets: BODY_ANCHOR.sheets, reference: BODY_ANCHOR.reference, headWeight: BODY_ANCHOR.headWeight } },
  facing: 'right (left = Phaser flipX)',
  animations: sheets.map((s) => ({
    name: s.name,
    kind: s.kind,
    source: `art/masters/${s.rel}`,
    sourceSize: s.size,
    sha256: s.sha,
    frames: s.frames.length,
    seamOpaqueCrossings: s.crossed,
    sheetScale: round(s.scale),
    manualScaleAdjust: s.scaleAdjust ?? 1,
    airborneFrames: s.air ?? [],
    horizontalAnchor: BODY_ANCHOR.sheets.includes(s.name) ? 'body' : 'fur',
    ...(s.bodyAnchored !== undefined ? { bodyLandmarks: runtime.filter((f) => f.sheet === s.name && f.landmarks).map((f) => ({ frame: f.name, method: f.anchorMethod, ...f.landmarks })) } : {}),
    frameBoxes: s.frames.map((f) => f.box),
    status: 'INTEGRATED',
  })),
};
fs.writeFileSync(path.join(MASTERS, SRC, 'CHARACTER_V2_MANIFEST.json'), JSON.stringify(sourceManifest, null, 2) + '\n');

console.log(`atlas ${atlasW}x${atlasH}, ${runtime.length} frames, cell ${CW}x${CH}, anchor ${AX},${AY}, ${(fs.statSync(imageFile).size / 1024).toFixed(0)} KB`);
for (const s of sheets) console.log(`  ${s.name.padEnd(10)} scale ${s.scale.toFixed(3)}`);
