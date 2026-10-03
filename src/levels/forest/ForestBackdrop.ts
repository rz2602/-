import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config/constants';
import { ForestDepth, ForestLayers, type VisualLayer } from './forestLayers';
import { FxTextures } from './forestFx';

/** How a background strip is laid out on screen (with the camera at the bottom of the level). */
const STRIPS = {
  clouds: { key: 'bg_sky', layer: ForestLayers.sky, scale: 3, screenY: 10 },
  distant: { key: 'bg_forest_distant', layer: ForestLayers.distantForest, scale: 3, screenY: 205 },
  mid: { key: 'bg_forest_mid', layer: ForestLayers.midForest, scale: 3.2, screenY: 285 },
} as const;

const MOUNTAINS = {
  key: 'bg_mountains',
  scale: 3.2,
  screenY: 118,
  /** Width (texture px) of the strip's left part that contains no Sirengrad; used for filler copies. */
  fillerWidth: 250,
} as const;

const SHAFTS = { layer: 0.3, alpha: 0.85 };
/** The understory starts this far above the mid-forest strip's bottom edge (hidden behind it). */
const UNDERSTORY_OVERLAP = 40;
const HAZE = { screenY: 250, height: 210, scrollY: 0.1, alpha: 0.55 };
const SUN_WASH_ALPHA = 0.35;

/** Distant layer tints: cooler and softer further away (atmospheric perspective). */
const TINTS = { distant: 0xdce8f2, mid: 0xf2f5ea };

/** Overlap between neighbouring strip images (logical px) so no seam shows at fractional positions. */
const STRIP_OVERLAP = 1;

/**
 * A horizontally repeating strip drawn as a row of plain images, repositioned
 * every frame. Unlike a TileSprite, each image samples its (non power-of-two)
 * texture 1:1 - Phaser would first stretch a TileSprite texture to the next
 * power of two, an extra resampling pass that softens the art.
 */
class ImageStrip {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly step: number;

  constructor(scene: Phaser.Scene, key: string, scale: number, depth: number) {
    const frame = scene.textures.getFrame(key);
    this.step = frame.width * scale - STRIP_OVERLAP;
    const count = Math.ceil(GAME_WIDTH / this.step) + 1;
    for (let i = 0; i < count; i++) {
      this.images.push(scene.add.image(0, 0, key).setOrigin(0).setScale(scale).setScrollFactor(0).setDepth(depth));
    }
  }

  get height(): number {
    return this.images[0].displayHeight;
  }

  setTint(color: number): this {
    for (const image of this.images) image.setTint(color);
    return this;
  }

  /** `offsetX` = how far the layer has scrolled (logical px). */
  place(offsetX: number, y: number): void {
    const start = -(((offsetX % this.step) + this.step) % this.step);
    this.images.forEach((image, i) => image.setPosition(start + i * this.step, y));
  }
}

interface TiledLayer {
  /** Strips and TileSprites scroll horizontally; plain images (haze) only move vertically. */
  sprite: ImageStrip | Phaser.GameObjects.TileSprite | Phaser.GameObjects.Image;
  scrollX: number;
  scrollY: number;
  screenY: number;
  tileScale: number;
}

/**
 * Background layers 0-3 (sky, mountains + Sirengrad, distant forest, mid
 * forest) plus haze, sun shafts and a warm sunlight wash.
 *
 * Repeating layers are screen-wide rows of images (ImageStrip) whose offset
 * follows the camera by the layer's scroll factor - a few quads per layer
 * regardless of level length, each sampling its texture 1:1. The mountains are real images with Phaser scroll factors, laid out
 * so Sirengrad appears once - in view at the end of the level.
 */
export class ForestBackdrop {
  private readonly tiled: TiledLayer[] = [];
  private readonly cameraBottom: number;

  constructor(
    private readonly scene: Phaser.Scene,
    options: { worldWidth: number; cameraBottom: number },
  ) {
    this.cameraBottom = options.cameraBottom;

    scene.add
      .image(0, 0, FxTextures.sky)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(ForestLayers.sky.depth - 1);

    this.addTiled(STRIPS.clouds.key, STRIPS.clouds.layer, STRIPS.clouds.scale, STRIPS.clouds.screenY);
    this.buildMountains(options.worldWidth);

    const haze = scene.add
      .image(0, HAZE.screenY, FxTextures.haze)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, HAZE.height)
      .setScrollFactor(0)
      .setDepth(ForestDepth.haze)
      .setAlpha(HAZE.alpha);
    this.tiled.push({ sprite: haze, scrollX: 0, scrollY: HAZE.scrollY, screenY: HAZE.screenY, tileScale: 1 });

    this.addTiled(STRIPS.distant.key, STRIPS.distant.layer, STRIPS.distant.scale, STRIPS.distant.screenY).setTint(TINTS.distant);

    const shafts = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, FxTextures.sunbeams)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(ForestDepth.lightShafts)
      .setAlpha(SHAFTS.alpha)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tiled.push({ sprite: shafts, scrollX: SHAFTS.layer, scrollY: 0, screenY: 0, tileScale: 1 });

    const mid = this.addTiled(STRIPS.mid.key, STRIPS.mid.layer, STRIPS.mid.scale, STRIPS.mid.screenY).setTint(TINTS.mid);
    // Dark understory hanging below the mid forest (moves with it).
    const understoryY = STRIPS.mid.screenY + mid.height - UNDERSTORY_OVERLAP;
    const understory = scene.add
      .image(0, understoryY, FxTextures.understory)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(ForestLayers.midForest.depth - 0.5);
    this.tiled.push({ sprite: understory, scrollX: 0, scrollY: ForestLayers.midForest.scrollY, screenY: understoryY, tileScale: 1 });

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
    for (const layer of this.tiled) {
      const sprite = layer.sprite;
      const y = layer.screenY + rise * layer.scrollY;
      if (sprite instanceof ImageStrip) {
        sprite.place(camera.scrollX * layer.scrollX, y);
        continue;
      }
      if (sprite instanceof Phaser.GameObjects.TileSprite) sprite.tilePositionX = (camera.scrollX * layer.scrollX) / layer.tileScale;
      sprite.y = y;
    }
  }

  private addTiled(key: string, layer: VisualLayer, scale: number, screenY: number): ImageStrip {
    const strip = new ImageStrip(this.scene, key, scale, layer.depth);
    strip.place(0, screenY);
    this.tiled.push({ sprite: strip, scrollX: layer.scrollX, scrollY: layer.scrollY, screenY, tileScale: scale });
    return strip;
  }

  private buildMountains(worldWidth: number): void {
    const { scrollX, scrollY, depth } = ForestLayers.mountains;
    const texture = this.scene.textures.get(MOUNTAINS.key);
    const source = texture.getSourceImage() as HTMLImageElement;
    if (!texture.has('filler')) texture.add('filler', 0, 0, 0, MOUNTAINS.fillerWidth, source.height);

    // Layer position for the camera at the bottom; scroll factors do the rest.
    const y = MOUNTAINS.screenY + (this.cameraBottom - GAME_HEIGHT) * scrollY;
    const maxScroll = Math.max(0, worldWidth - GAME_WIDTH);
    const fullWidth = source.width * MOUNTAINS.scale;
    const fillerWidth = MOUNTAINS.fillerWidth * MOUNTAINS.scale;

    // The full strip (with Sirengrad) is right-aligned to the screen at the end of the level.
    let x = maxScroll * scrollX + GAME_WIDTH - fullWidth;
    this.addMountainImage(MOUNTAINS.key, x, y, false, scrollX, scrollY, depth);
    // City-free filler copies to the left, alternately mirrored so seams match.
    for (let flip = true; x > -fillerWidth; flip = !flip) {
      x -= fillerWidth;
      this.addMountainImage('filler', x, y, flip, scrollX, scrollY, depth);
    }
  }

  private addMountainImage(frame: string, x: number, y: number, flipX: boolean, sx: number, sy: number, depth: number): void {
    // Name the frame explicitly: once a custom frame exists, Phaser's default
    // frame for the texture is that custom frame, not the full image.
    const image = this.scene.add.image(x, y, MOUNTAINS.key, frame === MOUNTAINS.key ? '__BASE' : frame);
    image.setOrigin(0).setScale(MOUNTAINS.scale).setFlipX(flipX).setScrollFactor(sx, sy).setDepth(depth);
  }
}
