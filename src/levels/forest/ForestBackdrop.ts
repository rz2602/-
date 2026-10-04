import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/constants';
import { ForestDepth, ForestLayers, type VisualLayer } from './forestLayers';
import { FxTextures } from './forestFx';
import { getProductionAsset, ProductionKeys } from './productionAssets';

/**
 * Display scale (runtime texture px -> logical px) per parallax layer. The
 * masters are 2172 px wide, so 0.6 = 120% of native at 1440p (render scale 2)
 * and 90% at 1080p. Keep <= 0.625 (125% at 1440p).
 */
const LAYER_SCALE = { sky: 0.6, mountains: 0.6, distant: 0.6, mid: 0.62 } as const;

/**
 * Where each layer's artwork starts on screen when the camera is at its
 * lowest point (logical px). Sky = image top; the others = top edge of the
 * layer's opaque content band (see production-assets.json contentBand).
 */
const LAYOUT = { skyTop: 0, mountainsPeakTop: 88, distantBandTop: 296, midBandTop: 318 } as const;

/** Mountains: top of the tallest peak in the master (normalized), used to place the range. */
const MOUNTAINS_PEAK_TOP = 0.2;
/** Mountains: mirror-join column on the left end (normalized) - a local peak at source x 194. */
const MOUNTAINS_LEFT_JOIN = 0.0893;

const SHAFTS = { scrollX: 0.3, alpha: 0.55 };
const SUN_WASH_ALPHA = 0.3;
/** The understory starts this far above the mid-forest artwork's bottom edge (hidden behind it). */
const UNDERSTORY_OVERLAP = 40;

/** Overlap between neighbouring strip images (logical px) so no seam shows at fractional positions. */
const STRIP_OVERLAP = 1;

export interface ForestBackdropOptions {
  worldWidth: number;
  cameraBottom: number;
  /**
   * Screen x (logical) of Sirengrad's centre when the camera is at its
   * right-most position. Default: the mountain range is right-aligned to the
   * screen, which puts Sirengrad centre-right at the final viewpoint.
   */
  sirengradScreenX?: number;
}

/**
 * A horizontally repeating strip drawn as a row of plain images (sampled 1:1
 * - no TileSprite power-of-two resampling). Copies alternate between normal
 * and mirrored, so every join matches pixel-for-pixel and no hard seam shows.
 */
class MirrorStrip {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly step: number;

  /** Added to the scroll offset; lets a strip choose where its mirror joins fall. */
  phase = 0;

  constructor(scene: Phaser.Scene, key: string, scale: number, depth: number) {
    this.step = scene.textures.getFrame(key).width * scale - STRIP_OVERLAP;
    const count = Math.ceil(GAME_WIDTH / this.step) + 1;
    for (let i = 0; i < count; i++) {
      this.images.push(scene.add.image(0, 0, key).setOrigin(0).setScale(scale).setScrollFactor(0).setDepth(depth));
    }
  }

  get height(): number {
    return this.images[0].displayHeight;
  }

  /** `offsetX` = how far the layer has scrolled (logical px). */
  get stepWidth(): number {
    return this.step;
  }

  place(scrollOffset: number, y: number): void {
    const offsetX = scrollOffset + this.phase;
    const first = Math.floor(offsetX / this.step);
    const start = first * this.step - offsetX;
    this.images.forEach((image, i) => {
      // Odd copies are mirrored: their left edge equals the previous copy's right edge.
      image.setFlipX((first + i) % 2 !== 0).setPosition(start + i * this.step, y);
    });
  }
}

interface MovingLayer {
  /** Strips scroll horizontally; plain images only move vertically. */
  target: MirrorStrip | Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
  scrollX: number;
  scrollY: number;
  screenY: number;
}

/**
 * Parallax layers 0-3, each an INDEPENDENT transparent illustration:
 *
 *   0 sky (opaque, 0.05) -> 1 mountains + Sirengrad (0.10)
 *   -> 2 distant forest (0.20) -> 3 mid forest (0.40)
 *
 * plus a sky gradient fallback, soft sun shafts, a warm sun wash and a dark
 * understory below the mid forest. The mountains are placed as unique world
 * images so Sirengrad appears exactly once (see buildMountains).
 */
export class ForestBackdrop {
  private readonly moving: MovingLayer[] = [];
  private readonly cameraBottom: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: ForestBackdropOptions,
  ) {
    this.cameraBottom = options.cameraBottom;

    // Gradient behind everything: never an empty canvas, whatever the camera does.
    scene.add
      .image(0, 0, FxTextures.sky)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(ForestLayers.sky.depth - 1);

    const sky = this.addStrip(ProductionKeys.sky, ForestLayers.sky, LAYER_SCALE.sky, LAYOUT.skyTop);
    // The sky has its sun near the right edge, so a mirror join there would show
    // two suns. Phase the strip so the whole camera range ends inside one
    // unmirrored copy: the only join falls on the sun-free left edge.
    const skyTravel = Math.max(0, options.worldWidth - GAME_WIDTH) * ForestLayers.sky.scrollX;
    sky.phase = sky.stepWidth - (GAME_WIDTH + skyTravel);
    sky.place(0, LAYOUT.skyTop);
    this.buildMountains();

    const shafts = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, FxTextures.sunbeams)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(ForestDepth.lightShafts)
      .setAlpha(SHAFTS.alpha)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.moving.push({ target: shafts, scrollX: SHAFTS.scrollX, scrollY: 0, screenY: 0 });

    this.addStrip(ProductionKeys.forestDistant, ForestLayers.distantForest, LAYER_SCALE.distant, this.bandTopToImageY(ProductionKeys.forestDistant, LAYER_SCALE.distant, LAYOUT.distantBandTop));
    const midY = this.bandTopToImageY(ProductionKeys.forestMid, LAYER_SCALE.mid, LAYOUT.midBandTop);
    const mid = this.addStrip(ProductionKeys.forestMid, ForestLayers.midForest, LAYER_SCALE.mid, midY);

    const understoryY = midY + mid.height - UNDERSTORY_OVERLAP;
    const understory = scene.add
      .image(0, understoryY, FxTextures.understory)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(ForestLayers.midForest.depth - 0.5);
    this.moving.push({ target: understory, scrollX: 0, scrollY: ForestLayers.midForest.scrollY, screenY: understoryY });

    scene.add
      .image(0, 0, FxTextures.sunWash)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(ForestDepth.sunWash)
      .setAlpha(SUN_WASH_ALPHA)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Call every frame (or once for static scenes such as menus). */
  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    // 0 when the camera is at its lowest point, growing as it rises.
    const rise = this.cameraBottom - GAME_HEIGHT - camera.scrollY;
    for (const layer of this.moving) {
      const y = layer.screenY + rise * layer.scrollY;
      const t = layer.target;
      if (t instanceof MirrorStrip) t.place(camera.scrollX * layer.scrollX, y);
      else {
        if (t instanceof Phaser.GameObjects.TileSprite) t.tilePositionX = camera.scrollX * layer.scrollX;
        t.y = y;
      }
    }
  }

  private addStrip(key: string, layer: VisualLayer, scale: number, screenY: number): MirrorStrip {
    const strip = new MirrorStrip(this.scene, key, scale, layer.depth);
    strip.place(0, screenY);
    this.moving.push({ target: strip, scrollX: layer.scrollX, scrollY: layer.scrollY, screenY });
    return strip;
  }

  /** Image top y that puts the layer's content band top at `bandTop` on screen. */
  private bandTopToImageY(key: string, scale: number, bandTop: number): number {
    const asset = getProductionAsset(this.scene, key);
    const frameHeight = this.scene.textures.getFrame(key).height;
    return bandTop - (asset?.contentBand?.top ?? 0) * frameHeight * scale;
  }

  /**
   * Layer 1. The full range (with Sirengrad) is placed ONCE, right-aligned to
   * the screen at the end of the level, so the city is seen from the final
   * viewpoint. Further left the range is extended with alternately mirrored
   * copies of its castle-free left part only - no duplicate castle can appear.
   * Images use Phaser scroll factors (0.10 / 0.05) so they parallax naturally.
   */
  private buildMountains(): void {
    const key = ProductionKeys.mountains;
    const asset = getProductionAsset(this.scene, key);
    const texture = this.scene.textures.get(key);
    const { width: W, height: H } = texture.getSourceImage() as HTMLImageElement;
    const s = LAYER_SCALE.mountains;
    const { scrollX, scrollY, depth } = ForestLayers.mountains;

    const joinL = Math.round(MOUNTAINS_LEFT_JOIN * W);
    const joinR = Math.round((asset?.castleFreeEnd ?? 0.5) * W);
    if (!texture.has('full')) texture.add('full', 0, joinL, 0, W - joinL, H);
    if (!texture.has('filler')) texture.add('filler', 0, joinL, 0, joinR - joinL, H);

    // Layer position for the camera at the bottom; scroll factors do the rest.
    const y = LAYOUT.mountainsPeakTop - MOUNTAINS_PEAK_TOP * H * s + (this.cameraBottom - GAME_HEIGHT) * scrollY;
    const maxScroll = Math.max(0, this.options.worldWidth - GAME_WIDTH);
    const fillerWidth = (joinR - joinL) * s;
    const castleCentre = (0.68 * W - joinL) * s; // Sirengrad's centre inside the 'full' frame
    // Right-align the solid part of the range (its tapered tip stays just off-screen).
    const solidRight = (asset?.solidColumns?.right ?? 1) * W;
    const rightAligned = maxScroll * scrollX + GAME_WIDTH - (solidRight - joinL) * s;
    const x = this.options.sirengradScreenX === undefined
      ? rightAligned
      : maxScroll * scrollX + this.options.sirengradScreenX - castleCentre;

    this.addMountainImage('full', x, y, false, s, scrollX, scrollY, depth);
    // Extension copies leftwards until the layer covers the screen at scroll 0.
    let left = x;
    for (let mirrored = true; left > 0; mirrored = !mirrored) {
      left -= fillerWidth;
      this.addMountainImage('filler', left, y, mirrored, s, scrollX, scrollY, depth);
    }
  }

  private addMountainImage(frame: string, x: number, y: number, flipX: boolean, s: number, sx: number, sy: number, depth: number): void {
    this.scene.add
      .image(x, y, ProductionKeys.mountains, frame)
      .setOrigin(0)
      .setScale(s)
      .setFlipX(flipX)
      .setScrollFactor(sx, sy)
      .setDepth(depth);
  }
}
