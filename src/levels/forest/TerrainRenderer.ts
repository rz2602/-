import Phaser from 'phaser';
import type { LevelDef, PlatformDef, TerrainDef } from '../LevelTypes';
import { ForestDepth } from './forestLayers';
import { FxTextures } from './forestFx';
import { getProductionAsset, type ProductionAsset } from './productionAssets';

/**
 * Visual-only terrain built from the Forest Environment Asset Kit. Collision
 * is created separately as plain rectangles (LevelBuilder) and is NOT touched
 * here: every piece of art is positioned FROM the collision geometry, so the
 * grass "walk line" of each piece sits exactly on the collision top.
 *
 *   ground strip - grass / soil / roots slab across each terrain block,
 *                  repeated with mirror joins (no seams) and natural rounded ends
 *   cliff column - rock face below each exposed block edge (gap or drop),
 *                  its top tucked under the ground strip so the grass lip marks
 *                  the gameplay edge exactly
 *   rock pillar  - narrow islands stand on the cliff wall piece
 *   ravine wall  - darker cliff wall far back in every gap
 *   earth fill   - smooth dark earth inside the blocks, below the strip
 *
 * Sizes are WORLD sizes (logical px per master px), independent of the
 * runtime texture resolution. VISUAL SHAPE != PHYSICS SHAPE: grass blades,
 * vines and rocks overhang freely.
 */
const TERRAIN_ART = {
  /** Logical px per master px. */
  groundScale: 0.45,
  cliffScale: 0.42,
  ravineWallScale: 0.42,
  /** The strip's grass edge extends this far past a block end (logical px). */
  groundEndOverhang: 4,
  /** Cliff column: master columns kept (column only, without its grass cap) and rows hidden under the strip. */
  cliffColumnWidth: 545,
  cliffCropBelowWalk: 120,
  /** Narrow islands (both ends exposed and narrower than this) stand on a single rock pillar. */
  pillarMaxWidth: 470,
  pillarCropTop: 230,
  pillarOverhang: 6,
  /** Ravine wall: its full-width row sits this far below the lower bank's surface; darker and cooler. */
  ravineWallBelowGround: 42,
  /** Narrow pits: higher, so the backdrop's lower edge never shows through them when the camera is high. */
  pitWallBelowGround: -30,
  ravineWallTint: 0x4f4842,
  /** Pits: one far wall per this much width (logical px; walls overlap). */
  pitWallSpacing: 220,
  /** Earth fill starts this far below the walk line (always under the strip). */
  fillBelowWalk: 70,
  /** Earth gradient height (logical px), then the deepest colour continues down. */
  fillGradientHeight: 380,
  fillDeepColor: 0x211710,
  /** Platforms: grass edge overhang past the collision ends (logical px). */
  platformOverhang: 8,
  /** Bridge: posts stand this far onto each bank; the sagging deck is balanced around the flat collision. */
  bridgePostInset: 34,
  bridgeDeckBalance: 0.55,
} as const;

const KEYS = {
  ground: 'env_ground_long',
  cliffLeft: 'env_cliff_left',
  cliffRight: 'env_cliff_right',
  cliffWall: 'env_cliff_wall',
  bridge: 'env_bridge_rope_medium',
  platformLong: 'env_platform_long',
  platformMedium: 'env_platform_medium',
  platformSmall: 'env_platform_small',
  platformTiny: 'env_platform_tiny',
} as const;

/** Collision width (logical px) -> platform art. Never one asset stretched to every size. */
const PLATFORM_BY_WIDTH: Array<[number, string]> = [
  [190, KEYS.platformLong],
  [170, KEYS.platformMedium],
  [130, KEYS.platformSmall],
  [0, KEYS.platformTiny],
];

const SEAM_OVERLAP = 0.5;

interface Art {
  asset: ProductionAsset;
  geo: Record<string, number> & { slab?: { left: number; right: number } };
  /** Runtime texture size. */
  w: number;
  h: number;
  /** Image scale that gives `logicalPerMasterPx` world size. */
  scale(logicalPerMasterPx: number): number;
}

function art(scene: Phaser.Scene, key: string): Art {
  const asset = getProductionAsset(scene, key);
  if (!asset) throw new Error(`missing production asset ${key}`);
  return {
    asset,
    geo: (asset.geometry ?? {}) as Art['geo'],
    w: asset.width,
    h: asset.height,
    scale: (k) => (k * asset.masterSize[0]) / asset.width,
  };
}

/** Named sub-frame (cached on the texture). */
function frame(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number): string {
  const tex = scene.textures.get(key);
  const name = `${Math.round(x)}_${Math.round(y)}_${Math.round(w)}_${Math.round(h)}`;
  if (!tex.has(name)) tex.add(name, 0, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  return name;
}

// ---------------------------------------------------------------- blocks ---

/** Exposed ends: open to a gap, or higher than the neighbouring block. */
function exposure(t: TerrainDef, level: LevelDef): { left: boolean; right: boolean } {
  const leftNeighbour = level.terrain.find((o) => o.x + o.width === t.x);
  const rightNeighbour = level.terrain.find((o) => o.x === t.x + t.width);
  return {
    left: t.x > 0 && (!leftNeighbour || leftNeighbour.top > t.top),
    right: t.x + t.width < level.width && (!rightNeighbour || rightNeighbour.top > t.top),
  };
}

export function drawTerrainBlock(scene: Phaser.Scene, t: TerrainDef, level: LevelDef): void {
  const ex = exposure(t, level);
  const right = t.x + t.width;

  // Earth fill (smooth: no texture to magnify), inset where a cliff column covers the edge.
  const fillTop = t.top + TERRAIN_ART.fillBelowWalk;
  const inset = 30;
  const fx0 = t.x + (ex.left ? inset : 0);
  const fx1 = right - (ex.right ? inset : 0);
  const fillW = Math.max(1, fx1 - fx0);
  scene.add
    .image(fx0, fillTop, FxTextures.earth)
    .setOrigin(0)
    .setDisplaySize(fillW, TERRAIN_ART.fillGradientHeight)
    .setDepth(ForestDepth.terrainFill);
  const deepTop = fillTop + TERRAIN_ART.fillGradientHeight - 1;
  scene.add
    .rectangle(fx0, deepTop, fillW, level.height + 200 - deepTop, TERRAIN_ART.fillDeepColor)
    .setOrigin(0)
    .setDepth(ForestDepth.terrainFill);

  if (ex.left && ex.right && t.width < TERRAIN_ART.pillarMaxWidth) {
    drawPillar(scene, t);
  } else {
    if (ex.left) drawCliffColumn(scene, 'left', t.x, t.top);
    if (ex.right) drawCliffColumn(scene, 'right', right, t.top);
  }

  const o = TERRAIN_ART.groundEndOverhang;
  drawGroundStrip(scene, t.x - o, right + o, t.top, ForestDepth.terrainCap);
}

/**
 * Ground strip from x0 to x1 (visual grass extent). The texture is laid out as
 * a "tape" that runs forward and backward through its full-height middle
 * columns: every direction change is a mirror join (pixel-continuous, no
 * seam), and the tape always starts and ends on the artwork's natural rounded
 * ends. Only bounce positions vary, so nothing is stretched.
 */
function drawGroundStrip(scene: Phaser.Scene, x0: number, x1: number, walkY: number, depth: number): void {
  const a = art(scene, KEYS.ground);
  const k = a.scale(TERRAIN_ART.groundScale);
  const W = a.w;
  const c1 = a.geo.tileFrom * W;
  const c2 = a.geo.tileTo * W;
  const slabL = (a.geo.slab?.left ?? 0) * W;
  const slabR = (a.geo.slab?.right ?? 1) * W;
  // Tape length in texture px: visible length plus the transparent margins at both ends.
  const T = (x1 - x0) / k + slabL + (W - slabR);

  const segments: Array<[number, number]> = [];
  if (T <= W) {
    const b = Phaser.Math.Clamp(T / 2, c1, c2);
    segments.push([0, b], [b, 0]);
  } else if (T <= 2 * c2 + W - 2 * c1) {
    const b = Phaser.Math.Clamp((2 * c2 + W - T) / 2, c1, c2);
    segments.push([0, c2], [c2, b], [b, W]);
  } else {
    segments.push([0, c2]);
    let pos = c2;
    let forward = false;
    let rest = T - c2;
    for (let guard = 0; guard < 64; guard++) {
      if (!forward && rest <= c2 + W - 2 * c1) {
        const b = Phaser.Math.Clamp((c2 + W - rest) / 2, c1, c2);
        segments.push([pos, b], [b, W]);
        break;
      }
      if (forward && rest <= 2 * c2 - c1) {
        const b = Phaser.Math.Clamp((rest + c1) / 2, c1, c2);
        segments.push([pos, b], [b, 0]);
        break;
      }
      const next = forward ? c2 : c1;
      segments.push([pos, next]);
      rest -= Math.abs(next - pos);
      pos = next;
      forward = !forward;
    }
  }

  // Exact fit: spread the (tiny) clamp/rounding difference over the strip.
  const tape = segments.reduce((sum, [p, q]) => sum + Math.abs(q - p), 0);
  const kx = (k * T) / tape;
  let x = x0 - slabL * kx;
  for (const [p, q] of segments) {
    const lo = Math.min(p, q);
    const width = Math.abs(q - p);
    if (width < 1) continue;
    scene.add
      .image(x, walkY, KEYS.ground, frame(scene, KEYS.ground, lo, 0, width, a.h))
      .setOrigin(0, a.geo.walkY)
      .setScale(kx, k)
      .setFlipX(q < p)
      .setDepth(depth);
    x += width * kx - SEAM_OVERLAP;
  }
}

/** Rock column under an exposed edge; the outer rock face lines up with the collision edge. */
function drawCliffColumn(scene: Phaser.Scene, side: 'left' | 'right', edgeX: number, top: number): void {
  const a = art(scene, side === 'left' ? KEYS.cliffLeft : KEYS.cliffRight);
  const k = a.scale(TERRAIN_ART.cliffScale);
  const m = a.w / a.asset.masterSize[0]; // master px -> texture px
  const colW = TERRAIN_ART.cliffColumnWidth * m;
  const cropY = a.geo.walkY * a.h + TERRAIN_ART.cliffCropBelowWalk * m;
  const fx = side === 'left' ? 0 : a.w - colW;
  const name = frame(scene, side === 'left' ? KEYS.cliffLeft : KEYS.cliffRight, fx, cropY, colW, a.h - cropY);
  const faceInFrame = a.geo.faceX * a.w - fx;
  scene.add
    .image(edgeX - faceInFrame * k, top + (cropY - a.geo.walkY * a.h) * k, side === 'left' ? KEYS.cliffLeft : KEYS.cliffRight, name)
    .setOrigin(0)
    .setScale(k)
    .setDepth(ForestDepth.terrainShade);
}

/** Narrow island: one rock pillar under the ground strip. */
function drawPillar(scene: Phaser.Scene, t: TerrainDef): void {
  const a = art(scene, KEYS.cliffWall);
  const m = a.w / a.asset.masterSize[0];
  const left = 123 * m;
  const right = 880 * m;
  const cropY = TERRAIN_ART.pillarCropTop * m;
  const k = (t.width + TERRAIN_ART.pillarOverhang * 2) / (right - left);
  scene.add
    .image(t.x - TERRAIN_ART.pillarOverhang, t.top + TERRAIN_ART.fillBelowWalk - 30, KEYS.cliffWall, frame(scene, KEYS.cliffWall, left, cropY, right - left, a.h - cropY))
    .setOrigin(0)
    .setScale(k)
    .setDepth(ForestDepth.terrainShade);
}

/** Far ravine wall in every gap between terrain blocks (behind the terrain, in front of the back trees and waterfalls). */
export function drawRavines(scene: Phaser.Scene, level: LevelDef): void {
  const blocks = [...level.terrain].sort((a, b) => a.x - b.x);
  const a = art(scene, KEYS.cliffWall);
  const k = a.scale(TERRAIN_ART.ravineWallScale);
  const fullWidthY = (a.geo.fullWidthY ?? 0.13) * a.h;
  const wall = (centreX: number, ground: number, below: number = TERRAIN_ART.ravineWallBelowGround, flip = false): void => {
    scene.add
      .image(centreX, ground + below - fullWidthY * k, KEYS.cliffWall, '__BASE') // explicit: added sub-frames would otherwise become the default
      .setOrigin(0.5, 0)
      .setScale(k)
      .setTint(TERRAIN_ART.ravineWallTint)
      .setFlipX(flip)
      .setDepth(ForestDepth.ravine);
  };
  for (let i = 0; i + 1 < blocks.length; i++) {
    const x0 = blocks[i].x + blocks[i].width;
    const gap = blocks[i + 1].x - x0;
    if (gap > 0) wall(x0 + gap / 2, Math.max(blocks[i].top, blocks[i + 1].top));
  }
  // Pits (a low floor between two higher blocks) get far walls too: one for a
  // narrow pit, an overlapping row of alternately mirrored walls for a wide hollow.
  for (let i = 1; i + 1 < blocks.length; i++) {
    const [l, b, r] = [blocks[i - 1], blocks[i], blocks[i + 1]];
    const enclosed = l.x + l.width === b.x && b.x + b.width === r.x && l.top < b.top && r.top < b.top;
    if (!enclosed) continue;
    const count = Math.max(1, Math.round(b.width / TERRAIN_ART.pitWallSpacing));
    for (let j = 0; j < count; j++) {
      wall(b.x + ((j + 0.5) * b.width) / count, Math.max(l.top, r.top), TERRAIN_ART.pitWallBelowGround, j % 2 === 1);
    }
  }
}

// ------------------------------------------------------------- platforms ---

export function drawPlatform(scene: Phaser.Scene, p: PlatformDef, index = 0): void {
  if (p.style === 'bridge') {
    drawBridge(scene, p);
    return;
  }
  const key = PLATFORM_BY_WIDTH.find(([min]) => p.width >= min)?.[1] ?? KEYS.platformTiny;
  const a = art(scene, key);
  const slab = a.geo.slab ?? { left: 0, right: 1 };
  const flip = index % 2 === 1; // alternate orientation so neighbouring platforms differ
  const k = (p.width + TERRAIN_ART.platformOverhang * 2) / ((slab.right - slab.left) * a.w);
  const leftEdge = (flip ? 1 - slab.right : slab.left) * a.w;
  scene.add
    .image(p.x - TERRAIN_ART.platformOverhang - leftEdge * k, p.y, key)
    .setOrigin(0, a.geo.walkY)
    .setScale(k)
    .setFlipX(flip)
    .setDepth(ForestDepth.platform);
}

/**
 * Rope bridge: posts stand on both banks, the plank deck spans the gap. The
 * artwork's deck sags; the flat collision is unchanged, so the deck is
 * balanced around it (ends slightly above, centre slightly below).
 */
function drawBridge(scene: Phaser.Scene, p: PlatformDef): void {
  const a = art(scene, KEYS.bridge);
  const g = a.geo;
  const span = p.width + TERRAIN_ART.bridgePostInset * 2 - 40;
  const k = span / ((g.postRightX - g.postLeftX) * a.w);
  const sag = (g.deckMidY - g.deckEndY) * a.h * k;
  const deckEnd = p.y - sag * TERRAIN_ART.bridgeDeckBalance;
  const left = p.x + p.width / 2 - span / 2;
  scene.add
    .image(left - g.postLeftX * a.w * k, deckEnd - g.deckEndY * a.h * k, KEYS.bridge)
    .setOrigin(0)
    .setScale(k)
    .setDepth(ForestDepth.platform);
}
