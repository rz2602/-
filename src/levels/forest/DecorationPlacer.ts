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
};
/** Kit pieces stand on a small grass base; sink them this many texture px into the ground. */
const BASE_SINK = 3;
/** Back-layer pieces sink further so their bases stay hidden behind the terrain as the camera moves. */
const BACK_SINK_PX = 46;
const BACK_TINT = 0xe3ecdc;
/** Back-layer production art: a lighter touch of atmosphere (the art already carries depth). */
const BACK_TINT_PRODUCTION = 0xeef3ea;
const FOREGROUND_BELOW_BOTTOM = 28;

const SCATTER_KEYS = [
  'grass_tuft', 'grass_tuft_02', 'grass_patch', 'flowers_white', 'flowers_blue',
  'flowers_pink', 'flowers_purple', 'flowers_pink_02', 'mushroom_small', 'plant_small',
];
const SCATTER_SPACING = 120;
const SCATTER_CHANCE = 0.55;
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
    const sink = production ? 0 : BASE_SINK * scale;
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
      const { scrollX, depth } = ForestLayers.foreground;
      const [x] = this.parallaxPosition(d.x, d.y, scrollX, 1);
      image = this.scene.add
        .image(x, this.level.cameraBottom + FOREGROUND_BELOW_BOTTOM, d.key)
        .setOrigin(0.5, 1)
        .setScrollFactor(scrollX, 1)
        .setDepth(depth);
    } else {
      const isTree = d.key.startsWith('tree');
      image = this.scene.add
        .image(d.x, d.y + sink, d.key)
        .setOrigin(originX, originY)
        .setDepth(isTree ? ForestDepth.groundDecorBack : ForestDepth.groundDecor);
    }
    image.setScale(scale).setFlipX(d.flipX ?? false);
    if (d.key === 'lantern_post') this.addLanternGlow(image, scale, d.flipX ?? false);
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
        const scale = rand.realInRange(1.05, 1.35);
        this.scene.add
          .image(x + rand.between(-40, 40), t.top + BASE_SINK * scale, key)
          .setOrigin(0.5, 1)
          .setScale(scale)
          .setFlipX(rand.frac() < 0.5)
          .setDepth(ForestDepth.groundDecor);
      }
    }
  }
}
