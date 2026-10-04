import Phaser from 'phaser';
import { CAMERA, GAME_HEIGHT, GAME_WIDTH } from '../../config/constants';
import type { DecorationDef, LevelDef } from '../LevelTypes';
import { forestAnchor } from './forestAssets';
import { ForestDepth, ForestLayers } from './forestLayers';
import { FxTextures } from './forestFx';
import { getProductionAsset } from './productionAssets';

/** Default display scale per LEGACY kit texture (kit pieces are small; Mishkontin is ~130 px tall). */
const DEFAULT_SCALE: Record<string, number> = {
  tree_medium: 2.0,
  lantern_post: 1.6,
  wooden_sign: 1.15,
  wooden_fence: 1.5,
  fence_post: 1.5,
  wooden_crate: 1.25,
  wooden_crate_small: 1.25,
  barrel: 1.3,
  wooden_cart: 1.3,
  rock_large: 1.4,
  fallen_log: 1.4,
  fg_leaves_left: 1.6,
  fg_leaves_blur: 1.6,
  fg_trunk_right: 1.6,
};
const FALLBACK_SCALE = 1.3;

/**
 * Production (high-resolution) art is sized by WORLD HEIGHT in logical px,
 * independent of texture resolution, so swapping in a re-export at another
 * resolution never changes the world size. Values keep roughly the size of
 * the legacy art each piece replaces.
 */
const DEFAULT_HEIGHT: Record<string, number> = {
  tree_oak_01: 540,
  tree_oak_02: 520,
  tree_oak_03: 520,
  tree_pine_01: 490,
  tree_ancient_01: 420,
  waterfall_01: 270,
  // Forest Environment Asset Kit (Mishkontin is ~130 px tall).
  env_lantern_post: 185,
  env_signpost: 135,
  env_fence_01: 64,
  env_fence_02: 64,
  env_tree_stump: 64,
  env_fallen_log: 70,
  env_wood_crate: 62,
  env_barrel: 60,
  env_bridge_post: 100,
  env_rock_large_01: 120,
  env_rock_large_02: 120,
  env_rock_medium_01: 70,
  env_rock_medium_02: 70,
  env_rock_small_01: 42,
  env_rock_small_02: 42,
  env_rock_cluster_01: 75,
  env_bush_01: 66,
  env_bush_02: 64,
  env_fern_01: 66,
  env_fern_02: 66,
  env_grass_01: 36,
  env_grass_02: 36,
  env_flowers_01: 34,
  env_flowers_02: 34,
  env_mushrooms_01: 40,
  env_vines_01: 90,
  env_fg_fern_left: 260,
  env_fg_fern_right: 260,
  env_fg_grass_cluster_01: 190,
  env_fg_flower_cluster_01: 190,
  env_fg_branch: 330,
};
/** Production ground art: its measured ground contact sinks this far into the grass (logical px). */
const PRODUCTION_SINK = 6;
/** Kit pieces stand on a small grass base; sink them this many texture px into the ground. */
const BASE_SINK = 3;
/** Back-layer pieces sink further so their bases stay hidden behind the terrain as the camera moves. */
const BACK_SINK_PX = 46;
const BACK_TINT = 0xe3ecdc;
/** Back-layer production art: a lighter touch of atmosphere (the art already carries depth). */
const BACK_TINT_PRODUCTION = 0xeef3ea;
const FOREGROUND_BELOW_BOTTOM = 28;
/** Edge-framing foreground: how far its cut canvas edge sits beyond the screen edge (logical px). */
const FOREGROUND_EDGE_OUTSET = 24;

const SCATTER_KEYS = ['env_grass_01', 'env_grass_02', 'env_flowers_01', 'env_flowers_02', 'env_grass_01', 'env_mushrooms_01'];
const SCATTER_HEIGHT = { min: 22, max: 32 };
const SCATTER_SPACING = 150;
const SCATTER_CHANCE = 0.45;
const SCATTER_EDGE_MARGIN = 60;

const LANTERN_FLICKER_MS = 900;

/**
 * Places decorations on their visual layer. Decorations never collide.
 *
 * Parallax layers (back, foreground) use Phaser scroll factors, which shift
 * an object relative to the world as the camera moves. Each one is therefore
 * positioned for the camera the player will have when standing near it, so
 * it appears where the level data says when it matters.
 */
export class DecorationPlacer {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: LevelDef,
  ) {}

  placeAll(): void {
    for (const d of this.level.decorations) this.place(d);
    this.scatter();
  }

  place(d: DecorationDef): Phaser.GameObjects.Image {
    const layer = d.layer ?? 'ground';
    const production = getProductionAsset(this.scene, d.key);
    const scale = this.scaleFor(d, production !== undefined);
    // Production art: measured, normalized ground-contact anchor. Legacy kit
    // art: bottom-centre with a small sink into the ground (unchanged).
    const originX = production?.anchor?.x ?? 0.5;
    const originY = production?.anchor?.y ?? 1;
    const sink = production ? PRODUCTION_SINK : BASE_SINK * scale;
    let image: Phaser.GameObjects.Image;

    if (layer === 'back') {
      const { scrollX, scrollY, depth } = ForestLayers.backDecor;
      const [x, y] = this.parallaxPosition(d.x, d.y + BACK_SINK_PX, scrollX, scrollY);
      image = this.scene.add
        .image(x, y, d.key)
        .setOrigin(originX, originY)
        .setScrollFactor(scrollX, scrollY)
        .setTint(production ? BACK_TINT_PRODUCTION : BACK_TINT)
        .setDepth(depth);
    } else if (layer === 'foreground') {
      // Edge framing: bottom pieces rise from below the screen; top-anchored
      // pieces (a branch) hang from just above the top edge at that spot.
      const { scrollX, depth } = ForestLayers.foreground;
      // Edge-framing pieces (their artwork is cut off at a canvas edge) sit
      // just beyond the screen edge, and only where the camera cannot scroll
      // further in that direction (level start / end) - so the cut edge can
      // never come into view. Top-hanging pieces are pinned to the screen top.
      const edge = production !== undefined && (originX < 0.01 || originX > 0.99);
      const flip = d.flipX ?? false;
      const atLeft = edge && (originX < 0.01) !== flip;
      const fromTop = production !== undefined && originY < 0.05;
      const camX = Phaser.Math.Clamp(d.x - GAME_WIDTH / 2, 0, this.level.width - GAME_WIDTH);
      const x = edge
        ? (atLeft ? -FOREGROUND_EDGE_OUTSET : GAME_WIDTH + FOREGROUND_EDGE_OUTSET) + camX * scrollX
        : this.parallaxPosition(d.x, d.y, scrollX, 1)[0];
      image = this.scene.add
        .image(x, fromTop ? -FOREGROUND_EDGE_OUTSET : this.level.cameraBottom + FOREGROUND_BELOW_BOTTOM, d.key)
        .setOrigin(edge ? (atLeft ? 0 : 1) : production ? originX : 0.5, production ? originY : 1)
        .setScrollFactor(scrollX, fromTop ? 0 : 1)
        .setDepth(depth);
    } else if (d.hang) {
      // Hanging growth (vines): top edge just below the grass lip.
      image = this.scene.add.image(d.x, d.y, d.key).setOrigin(0.5, 0).setDepth(ForestDepth.groundDecor);
    } else {
      const isTree = d.key.startsWith('tree');
      image = this.scene.add
        .image(d.x, d.y + sink, d.key)
        .setOrigin(originX, originY)
        .setDepth(isTree ? ForestDepth.groundDecorBack : ForestDepth.groundDecor);
    }
    image.setScale(scale).setFlipX(d.flipX ?? false);
    if (d.key === 'lantern_post') this.addLanternGlow(image, scale, d.flipX ?? false);
    const light = production?.geometry as { lightX?: number; lightY?: number } | undefined;
    if (light?.lightX !== undefined && light.lightY !== undefined) this.addProductionGlow(image, light.lightX, light.lightY, d.key === 'env_signpost' ? 0.8 : 1.1);
    return image;
  }

  /** Display scale: production art by world height, legacy art by its scale factor. */
  scaleFor(d: Pick<DecorationDef, 'key' | 'scale' | 'height'>, production: boolean): number {
    if (production) {
      const height = d.height ?? DEFAULT_HEIGHT[d.key] ?? 500;
      return height / this.scene.textures.getFrame(d.key).height;
    }
    return d.scale ?? DEFAULT_SCALE[d.key] ?? FALLBACK_SCALE;
  }

  /** Where to put an object with the given scroll factors so it appears at (x, y) when the player is there. */
  parallaxPosition(x: number, y: number, scrollX: number, scrollY: number): [number, number] {
    const camX = Phaser.Math.Clamp(x - GAME_WIDTH / 2, 0, this.level.width - GAME_WIDTH);
    const camY = Phaser.Math.Clamp(y - CAMERA.followOffsetY - GAME_HEIGHT / 2, 0, this.level.cameraBottom - GAME_HEIGHT);
    return [x - camX * (1 - scrollX), y - camY * (1 - scrollY)];
  }

  /** Warm glow on a production lantern (light point measured on the master, normalized). */
  private addProductionGlow(image: Phaser.GameObjects.Image, lx: number, ly: number, size: number): void {
    const fx = image.flipX ? 1 - lx : lx;
    const x = image.x + (fx - image.originX) * image.displayWidth;
    const y = image.y + (ly - image.originY) * image.displayHeight;
    const glow = this.scene.add
      .image(x, y, FxTextures.glow)
      .setScale(size)
      .setAlpha(0.65)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ForestDepth.groundDecor + 0.5);
    this.scene.tweens.add({ targets: glow, alpha: 0.45, scale: size * 0.9, duration: LANTERN_FLICKER_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private addLanternGlow(post: Phaser.GameObjects.Image, scale: number, flipped: boolean): void {
    const [lx, ly] = forestAnchor(this.scene, 'lantern_post', 'light', [21, 37]);
    const offsetX = (lx - post.width / 2) * scale * (flipped ? -1 : 1);
    const x = post.x + offsetX;
    const y = post.y - (post.height - ly) * scale;
    const glow = this.scene.add
      .image(x, y, FxTextures.glow)
      .setScale(1.1)
      .setAlpha(0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ForestDepth.groundDecor + 0.5);
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.5,
      scale: 1.0,
      duration: LANTERN_FLICKER_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Deterministic small plants along chosen ground segments. */
  private scatter(): void {
    const rand = new Phaser.Math.RandomDataGenerator([`${this.level.id}-scatter`]);
    for (const index of this.level.scatterOn) {
      const t = this.level.terrain[index];
      if (!t) continue;
      for (let x = t.x + SCATTER_EDGE_MARGIN; x < t.x + t.width - SCATTER_EDGE_MARGIN; x += SCATTER_SPACING) {
        if (rand.frac() > SCATTER_CHANCE) continue;
        const key = rand.pick(SCATTER_KEYS);
        const anchor = getProductionAsset(this.scene, key)?.anchor ?? { x: 0.5, y: 1 };
        const scale = rand.realInRange(SCATTER_HEIGHT.min, SCATTER_HEIGHT.max) / this.scene.textures.getFrame(key).height;
        this.scene.add
          .image(x + rand.between(-40, 40), t.top + PRODUCTION_SINK, key)
          .setOrigin(anchor.x, anchor.y)
          .setScale(scale)
          .setFlipX(rand.frac() < 0.5)
          .setDepth(ForestDepth.groundDecor);
      }
    }
  }
}
