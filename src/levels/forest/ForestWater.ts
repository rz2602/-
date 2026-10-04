import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/constants';
import type { LevelDef } from '../LevelTypes';
import { ForestDepth } from './forestLayers';
import { FxTextures } from './forestFx';
import type { DecorationPlacer } from './DecorationPlacer';
import { ProductionKeys } from './productionAssets';

const RIVER_KEY = 'water_strip';
const RIVER_SCALE = 1.7;
/** River surface flow speed (px/s) and the counter-flowing shimmer. */
const FLOW_SPEED = 26;
const SHIMMER_SPEED = -14;
const SHIMMER_ALPHA = 0.3;
/** The water band's visible surface starts this far into its texture (px). */
const RIVER_SURFACE_OFFSET = 4;

/**
 * Water: one gently flowing river behind the terrain (visible in every gap,
 * touching it respawns), static high-resolution waterfall artwork on the back
 * layer, and a splash when Mishkontin falls in. Only tile offsets change per
 * frame. (v0.1.1: waterfalls are static artwork by design - no animated
 * waterfall system.)
 */
export class ForestWater {
  private readonly surfaces: Array<{ sprite: Phaser.GameObjects.TileSprite; speed: number }> = [];
  private readonly splashEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private elapsed = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly level: LevelDef,
    placer: DecorationPlacer,
  ) {
    for (const wf of level.waterfalls) {
      placer.place({ key: ProductionKeys.waterfall, layer: 'back', x: wf.x, y: wf.y, height: wf.height });
    }

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
  }

  /** Small splash where Mishkontin touches the water. */
  splash(x: number): void {
    if (this.level.waterSurfaceY !== undefined) this.splashEmitter?.explode(18, x, this.level.waterSurfaceY);
  }
}
