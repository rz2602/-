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
 *   3. Measurement per frame: body centre = centroid of fur pixels, feet =
 *      lowest row with real coverage, character scale = size of the pink ears
 *      (upper half of the frame) - the sheets were drawn at different sizes.
 *   4. Normalization: ONE character scale. Each sheet gets a single factor
 *      (idle ear size / sheet ear size, plus a documented manual correction
 *      where the ear proxy misreads a pose) so Mishkontin is the same size in
 *      every animation; frames are never scaled individually or stretched.
 *   5. Anchors: grounded frames sit on their feet (bottom-centre contact);
 *      airborne frames keep the body centre at the same height above the
 *      physics feet as in idle. All frames share one cell, so Phaser's origin
 *      is constant and nothing pops between frames.
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
  animations: Object.fromEntries(sheets.map((s) => [s.name, s.frames.map((_, i) => `${s.name}_${i}`)])),
};
fs.writeFileSync(path.join(OUT_DIR, 'mishkontin-v2-manifest.json'), JSON.stringify(runtimeManifest, null, 2) + '\n');

const sourceManifest = {
  note: 'Mishkontin V2 source audit + slicing record. Generated by tools/build-mishkontin-v2.mjs; masters are never modified.',
  normalization: { targetIdleHeightLogical: TARGET_IDLE_HEIGHT, runtimePxPerLogical: RUNTIME_PX_PER_LOGICAL, scaleReference: 'pink ear size (upper half of frame), idle median', anchorPolicy: 'grounded: feet (lowest covered row) + fur centroid x; airborne: fur centroid, body centre held at idle height above the feet' },
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
    frameBoxes: s.frames.map((f) => f.box),
    status: 'INTEGRATED',
  })),
};
fs.writeFileSync(path.join(MASTERS, SRC, 'CHARACTER_V2_MANIFEST.json'), JSON.stringify(sourceManifest, null, 2) + '\n');

console.log(`atlas ${atlasW}x${atlasH}, ${runtime.length} frames, cell ${CW}x${CH}, anchor ${AX},${AY}, ${(fs.statSync(imageFile).size / 1024).toFixed(0)} KB`);
for (const s of sheets) console.log(`  ${s.name.padEnd(10)} scale ${s.scale.toFixed(3)}`);
