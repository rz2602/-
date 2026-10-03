import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/constants';
import type { LevelDef } from '../LevelTypes';
import { forestAnchor } from './forestAssets';
import { ForestDepth, ForestLayers } from './forestLayers';
import { FxTextures } from './forestFx';
import type { DecorationPlacer } from './DecorationPlacer';

const RIVER_KEY = 'water_strip';
const RIVER_SCALE = 1.7;
/** River surface flow speed (px/s) and the counter-flowing shimmer. */
const FLOW_SPEED = 26;
const SHIMMER_SPEED = -14;
const SHIMMER_ALPHA = 0.3;
/** The water band's visible surface starts this far into its texture (px). */
const RIVER_SURFACE_OFFSET = 4;

const FALL_BAND = 'water_fall_band';
const FALL_SPEED = 140;
const FALL_ALPHA = 0.35;

/**
 * Lightweight animated water: one river running behind the terrain (visible in
 * every gap), animated waterfalls on the back layer, and splashes. Only tile
 * offsets change per frame; a few small particle emitters add foam.
 */
export class ForestWater {
  private readonly surfaces: Array<{ sprite: Phaser.GameObjects.TileSprite; speed: number }> = [];
  private readonly falls: Phaser.GameObjects.TileSprite[] = [];
  private readonly splashEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private elapsed = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: LevelDef,
    placer: DecorationPlacer,
  ) {
    for (const wf of level.waterfalls) this.addWaterfall(placer, wf.x, wf.y, wf.scale);

    const surfaceY = level.waterSurfaceY;
    if (surfaceY === undefined) return;

    const bandHeight = scene.textures.getFrame(RIVER_KEY).height * RIVER_SCALE;
    const top = surfaceY - RIVER_SURFACE_OFFSET * RIVER_SCALE;
    // Screen-wide horizontally (scroll factor x = 0), world-positioned vertically.
    scene.add
      .image(0, top + bandHeight * 0.6, FxTextures.deepWater)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, level.height + 200 - top)
      .setScrollFactor(0, 1)
      .setDepth(ForestDepth.water);
    const river = scene.add
      .tileSprite(0, top, GAME_WIDTH, bandHeight, RIVER_KEY)
      .setOrigin(0)
      .setTileScale(RIVER_SCALE)
      .setScrollFactor(0, 1)
      .setDepth(ForestDepth.waterSurface);
    const shimmer = scene.add
      .tileSprite(0, top + 3, GAME_WIDTH, bandHeight, RIVER_KEY)
      .setOrigin(0)
      .setTileScale(RIVER_SCALE * 1.3)
      .setFlipX(true)
      .setScrollFactor(0, 1)
      .setAlpha(SHIMMER_ALPHA)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ForestDepth.waterSurface);
    this.surfaces.push({ sprite: river, speed: FLOW_SPEED }, { sprite: shimmer, speed: SHIMMER_SPEED });

    this.splashEmitter = scene.add
      .particles(0, 0, FxTextures.droplet, {
        lifespan: 650,
        speedX: { min: -90, max: 90 },
        speedY: { min: -260, max: -120 },
        gravityY: 700,
        scale: { start: 1.6, end: 0.4 },
        alpha: { start: 0.95, end: 0 },
        emitting: false,
      })
      .setDepth(ForestDepth.effects);
  }

  update(camera: Phaser.Cameras.Scene2D.Camera, deltaMs: number): void {
    this.elapsed += deltaMs / 1000;
    for (const { sprite, speed } of this.surfaces) {
      sprite.tilePositionX = (camera.scrollX + this.elapsed * speed) / sprite.tileScaleX;
    }
    for (const fall of this.falls) fall.tilePositionY = (-this.elapsed * FALL_SPEED) / fall.tileScaleY;
  }

  /** Small splash where Mishkontin touches the water. */
  splash(x: number): void {
    if (this.level.waterSurfaceY !== undefined) this.splashEmitter?.explode(18, x, this.level.waterSurfaceY);
  }

  private addWaterfall(placer: DecorationPlacer, x: number, y: number, scale: number): void {
    const image = placer.place({ key: 'waterfall_large', layer: 'back', x, y, scale });
    const { scrollX, scrollY, depth } = ForestLayers.backDecor;
    const left = image.x - image.displayWidth / 2;
    const top = image.y - image.displayHeight;
    for (const name of ['fallA', 'fallB']) {
      const [x0, y0, x1, y1] = forestAnchor(this.scene, 'waterfall_large', name, []);
      if (x1 === undefined) continue;
      const fall = this.scene.add
        .tileSprite(left + x0 * scale, top + y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale, FALL_BAND)
        .setOrigin(0)
        .setTileScale(scale)
        .setScrollFactor(scrollX, scrollY)
        .setAlpha(FALL_ALPHA)
        .setDepth(depth + 1);
      this.falls.push(fall);
      this.scene.add
        .particles(left + ((x0 + x1) / 2) * scale, top + y1 * scale, FxTextures.droplet, {
          lifespan: 700,
          frequency: 90,
          speedX: { min: -50, max: 50 },
          speedY: { min: -70, max: -20 },
          gravityY: 120,
          scale: { start: 1.4, end: 0.3 },
          alpha: { start: 0.8, end: 0 },
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-((x1 - x0) * scale) / 2, -4, (x1 - x0) * scale, 8), quantity: 1 },
        })
        .setScrollFactor(scrollX, scrollY)
        .setDepth(depth + 2);
    }
  }
}
