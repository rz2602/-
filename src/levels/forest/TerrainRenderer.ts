import Phaser from 'phaser';
import type { LevelDef, PlatformDef, TerrainDef } from '../LevelTypes';
import { forestAnchor } from './forestAssets';
import { ForestDepth } from './forestLayers';
import { FxTextures } from './forestFx';

/**
 * Visual-only terrain. Collision is created separately as plain rectangles
 * (LevelBuilder); here only the artwork is layered so its grass "walk line"
 * sits exactly on the collision top:
 *
 *   cap   - tiled grass + soil band, rounded end caps on both sides
 *   fill  - tiled rocky soil down past the bottom of the world
 *   shade - depth and side shading so tall walls read as cliffs
 *
 * VISUAL SHAPE != PHYSICS SHAPE: grass blades and vines overhang freely.
 */
const TERRAIN_SCALE = 1.35;
const PLATFORM_SCALE = 1.0;
/** How far the fill starts inside the cap's soil band (fraction of cap height), hiding the seam. */
const FILL_OVERLAP = 0.6;
const SIDE_SHADE_WIDTH = 30;
const FILL_TINT = 0xe0cdb8;
const BRIDGE_BANK_OVERLAP = 22;
const RAVINE_TINT = 0x8a7462;
const RAVINE_START_BELOW_GROUND = 40;
const RAVINE_BELOW_WATER = 30;
const RAVINE_OVERLAP = 20;

const CAP = 'terrain_cap';
const CAP_LEFT = 'terrain_cap_left';
const CAP_RIGHT = 'terrain_cap_right';
/** Synthesised from the kit soil sample at load (see forestFx.generateSoil). */
const FILL = FxTextures.soil;
const BRIDGE = 'rope_bridge';

export function drawTerrainBlock(scene: Phaser.Scene, t: TerrainDef, level: LevelDef): void {
  const s = TERRAIN_SCALE;
  const capTop = t.top - walkLine(scene) * s;
  const capHeight = scene.textures.getFrame(CAP).height * s;
  const fillTop = capTop + capHeight * FILL_OVERLAP;
  const fillHeight = level.height + 200 - fillTop;

  scene.add
    .tileSprite(t.x, fillTop, t.width, fillHeight, FILL)
    .setOrigin(0)
    .setTileScale(s)
    .setTilePosition(t.x / s, 0)
    .setTint(FILL_TINT)
    .setDepth(ForestDepth.terrainFill);
  scene.add
    .image(t.x, fillTop, FxTextures.shadeDown)
    .setOrigin(0)
    .setDisplaySize(t.width, Math.min(fillHeight, 520))
    .setDepth(ForestDepth.terrainShade);
  scene.add
    .image(t.x, fillTop, FxTextures.shadeSide)
    .setOrigin(0)
    .setDisplaySize(SIDE_SHADE_WIDTH, fillHeight)
    .setDepth(ForestDepth.terrainShade);
  scene.add
    .image(t.x + t.width, fillTop, FxTextures.shadeSide)
    .setOrigin(1, 0)
    .setFlipX(true)
    .setDisplaySize(SIDE_SHADE_WIDTH, fillHeight)
    .setDepth(ForestDepth.terrainShade);

  drawCap(scene, t.x, capTop, t.width, s, ForestDepth.terrainCap);
}

/**
 * Back walls of the ravines between terrain blocks, down to the river. Drawn
 * behind the back-decoration layer so waterfalls can pour down into a gap.
 */
export function drawRavines(scene: Phaser.Scene, level: LevelDef): void {
  const blocks = [...level.terrain].sort((a, b) => a.x - b.x);
  const bottom = (level.waterSurfaceY ?? level.height) + RAVINE_BELOW_WATER;
  for (let i = 0; i + 1 < blocks.length; i++) {
    const left = blocks[i];
    const right = blocks[i + 1];
    const x0 = left.x + left.width;
    const gap = right.x - x0;
    if (gap <= 0) continue;
    const top = Math.max(left.top, right.top) + RAVINE_START_BELOW_GROUND;
    const x = x0 - RAVINE_OVERLAP;
    const width = gap + RAVINE_OVERLAP * 2;
    scene.add
      .tileSprite(x, top, width, bottom - top, FILL)
      .setOrigin(0)
      .setTileScale(TERRAIN_SCALE)
      .setTilePosition(x0 / TERRAIN_SCALE, 0)
      .setTint(RAVINE_TINT)
      .setDepth(ForestDepth.ravine);
    scene.add
      .image(x, top, FxTextures.shadeDown)
      .setOrigin(0)
      .setDisplaySize(width, bottom - top)
      .setDepth(ForestDepth.ravine);
  }
}

export function drawPlatform(scene: Phaser.Scene, p: PlatformDef): void {
  if (p.style === 'bridge') {
    drawBridge(scene, p);
    return;
  }
  const s = PLATFORM_SCALE;
  drawCap(scene, p.x, p.y - walkLine(scene) * s, p.width, s, ForestDepth.platform);
}

/** Grass/soil cap: tiled middle plus rounded ends. */
function drawCap(scene: Phaser.Scene, x: number, top: number, width: number, s: number, depth: number): void {
  const height = scene.textures.getFrame(CAP).height * s;
  const endWidth = Math.min(scene.textures.getFrame(CAP_LEFT).width * s, width / 2);
  scene.add
    .tileSprite(x + endWidth * 0.5, top, Math.max(1, width - endWidth), height, CAP)
    .setOrigin(0)
    .setTileScale(s)
    .setTilePosition(x / s, 0)
    .setDepth(depth);
  scene.add.image(x, top, CAP_LEFT).setOrigin(0).setScale(s).setDepth(depth);
  scene.add.image(x + width, top, CAP_RIGHT).setOrigin(1, 0).setScale(s).setDepth(depth);
}

/** Rope bridge whose plank deck lines up with the platform surface. */
function drawBridge(scene: Phaser.Scene, p: PlatformDef): void {
  const [leftX, deckY] = forestAnchor(scene, BRIDGE, 'deckLeft', [17, 44]);
  const [rightX] = forestAnchor(scene, BRIDGE, 'deckRight', [184, 44]);
  const span = p.width + BRIDGE_BANK_OVERLAP * 2;
  const k = span / (rightX - leftX);
  scene.add
    .image(p.x - BRIDGE_BANK_OVERLAP - leftX * k, p.y - deckY * k, BRIDGE)
    .setOrigin(0)
    .setScale(k)
    .setDepth(ForestDepth.platform);
}

function walkLine(scene: Phaser.Scene): number {
  return forestAnchor(scene, CAP, 'walkY', [0, 14])[1];
}
