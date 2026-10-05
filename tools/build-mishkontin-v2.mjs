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
  { name: 'run', file: 'run/mishkontin_run_v2_8frames.png', frames: 8, kind: 'core' },
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
 *     ONE character reference (idle frame 0); then a single per-sheet constant
 *     keeps the sheet's average placement on the physics anchor unchanged.
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
  return { data: px, width: w, height: h, box: [x0, y0, x1, y1], furX: furX / furN, furY: furY / furN, ear: Math.sqrt(pink), feet: feet + 1 };
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
function matchTemplate(g, w, h, p, x0, y0, x1, y1) {
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
 * idle reference; the medallion is small, so pass 2 re-searches it with the
 * sheet's own best-matching medallion as template. The torso search is limited
 * to the chest area below the head found first (belt and satchel buckles are gold too).
 */
function findBodyLandmarks(frames, refEye, refMedallion) {
  const cfg = BODY_ANCHOR;
  const find = (f, g, medallionTemplate) => {
    const eyeHit = matchTemplate(g, f.w, f.h, refEye, 0, 0, f.w, Math.round(f.h * 0.75));
    const eye = refineLandmark(f, eyeHit, 10, isPupil);
    const ex = Math.round(eye.x), ey = Math.round(eye.y);
    const mHit = matchTemplate(g, f.w, f.h, medallionTemplate, ex - 75, ey + 20, ex + 30, ey + 120);
    const medallion = refineLandmark(f, mHit, cfg.medallionHalf, isGold);
    return { eye, eyeScore: eyeHit.score, medallion, medallionScore: mHit.score };
  };
  const greys = frames.map(greyOf);
  const pass1 = frames.map((f, i) => find(f, greys[i], refMedallion));
  const best = pass1.reduce((b, r, i) => (r.eyeScore + r.medallionScore > pass1[b].eyeScore + pass1[b].medallionScore ? i : b), 0);
  const own = patchOf(greys[best], frames[best].w, pass1[best].medallion.x, pass1[best].medallion.y, cfg.medallionHalf);
  return frames.map((f, i) => find(f, greys[i], own));
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
  const img = { data, width: info.width, height: info.height };
  if (!meta.hasAlpha) throw new Error(`${rel}: no alpha channel - BLOCKED`);
  for (const [cx, cy] of [[0, 0], [img.width - 1, 0], [0, img.height - 1], [img.width - 1, img.height - 1]]) {
    if (data[(cy * img.width + cx) * 4 + 3] > 10) throw new Error(`${rel}: opaque corner - baked background? BLOCKED`);
  }
  // Occupied columns, ideal cut positions, seams.
  let first = img.width, last = 0;
  for (let x = 0; x < img.width; x++) {
    for (let y = 0; y < img.height; y++) {
      if (data[(y * img.width + x) * 4 + 3] > 100) { first = Math.min(first, x); last = Math.max(last, x); break; }
    }
  }
  const cell = (last + 1 - first) / sheet.frames;
  const bounds = [new Int32Array(img.height).fill(0)];
  const crossed = [];
  for (let i = 1; i < sheet.frames; i++) {
    const s = seam(img, first + i * cell, 0.3 * cell);
    bounds.push(s.pathX);
    crossed.push(s.crossed);
  }
  bounds.push(new Int32Array(img.height).fill(img.width));
  const frames = [];
  for (let i = 0; i < sheet.frames; i++) frames.push(extractFrame(img, bounds[i], bounds[i + 1]));
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
  if (sheet.scale > 1) throw new Error(`${sheet.name}: would be upscaled (${sheet.scale})`);
  for (const [i, f] of sheet.frames.entries()) {
    const w = Math.max(1, Math.round(f.width * sheet.scale));
    const h = Math.max(1, Math.round(f.height * sheet.scale));
    const data = await sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
      .resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer();
    cleanupAlpha(data);
    const air = sheet.air?.includes(i) ?? false;
    const anchorX = f.furX * sheet.scale;
    const anchorY = air ? f.furY * sheet.scale + bodyAboveFeet : f.feet * sheet.scale;
    runtime.push({ name: `${sheet.name}_${i}`, sheet: sheet.name, data, w, h, anchorX, anchorY, air });
  }
}

// Body anchor (see BODY_ANCHOR): upper-body centre, one constant per sheet keeps its mean placement.
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
    const shift = used.reduce((s, f) => s + f.anchorX - bodyX[frames.indexOf(f)], 0) / Math.max(1, used.length);
    frames.forEach((f, i) => {
      f.landmarks = { eye: [round(marks[i].eye.x, 1), round(marks[i].eye.y, 1)], eyeScore: round(marks[i].eyeScore, 2), medallion: [round(marks[i].medallion.x, 1), round(marks[i].medallion.y, 1)], medallionScore: round(marks[i].medallionScore, 2) };
      if (!ok[i]) {
        f.anchorMethod = 'fur (body landmarks not found)';
        console.warn(`  WARNING ${f.name}: head/torso not found (scores ${f.landmarks.eyeScore}/${f.landmarks.medallionScore}); fur centroid kept`);
        return;
      }
      f.anchorX = bodyX[i] + shift;
      f.anchorMethod = 'body';
    });
    sheet.bodyAnchorShift = round(shift, 2);
    console.log(`  ${sheet.name.padEnd(10)} body anchor: ${used.length}/${frames.length} frames, sheet constant ${shift.toFixed(2)} runtime px`);
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
  normalization: { targetIdleHeightLogical: TARGET_IDLE_HEIGHT, runtimePxPerLogical: RUNTIME_PX_PER_LOGICAL, scaleReference: 'pink ear size (upper half of frame), idle median', anchorPolicy: 'grounded: feet (lowest covered row) + x per sheet (body = midpoint of head pupil and torso medallion, matched against idle frame 0, plus one per-sheet constant keeping the mean placement; fur = fur centroid); airborne: fur centroid, body centre held at idle height above the feet', bodyAnchor: { sheets: BODY_ANCHOR.sheets, reference: BODY_ANCHOR.reference, headWeight: BODY_ANCHOR.headWeight } },
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
    ...(s.bodyAnchorShift !== undefined ? { bodyAnchorSheetConstant: s.bodyAnchorShift, bodyLandmarks: runtime.filter((f) => f.sheet === s.name && f.landmarks).map((f) => ({ frame: f.name, method: f.anchorMethod, ...f.landmarks })) } : {}),
    frameBoxes: s.frames.map((f) => f.box),
    status: 'INTEGRATED',
  })),
};
fs.writeFileSync(path.join(MASTERS, SRC, 'CHARACTER_V2_MANIFEST.json'), JSON.stringify(sourceManifest, null, 2) + '\n');

console.log(`atlas ${atlasW}x${atlasH}, ${runtime.length} frames, cell ${CW}x${CH}, anchor ${AX},${AY}, ${(fs.statSync(imageFile).size / 1024).toFixed(0)} KB`);
for (const s of sheets) console.log(`  ${s.name.padEnd(10)} scale ${s.scale.toFixed(3)}`);
