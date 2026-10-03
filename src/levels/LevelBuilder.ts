import Phaser from 'phaser';
import { DecorationPlacer } from './forest/DecorationPlacer';
import { ForestDepth } from './forest/forestLayers';
import { FxTextures } from './forest/forestFx';
import { drawPlatform, drawRavines, drawTerrainBlock } from './forest/TerrainRenderer';
import type { LevelDef } from './LevelTypes';

const SOLID_EXTRA_DEPTH = 200; // collision continues below the world bottom
const PLATFORM_BODY_HEIGHT = 16;
const FINISH_ZONE_WIDTH = 60;
const FINISH_ZONE_HEIGHT = 240;
const LIGHT_ALPHA = 0.5;
const LIGHT_SWAY_MS = 3200;

export interface BuiltLevel {
  /** Solid ground (collides on all sides). */
  solids: Phaser.Physics.Arcade.StaticGroup;
  /** One-way platforms (collide only from above). */
  platforms: Phaser.Physics.Arcade.StaticGroup;
  finishZone: Phaser.GameObjects.Zone;
  decorations: DecorationPlacer;
}

/**
 * Turns a LevelDef into simple, predictable static physics bodies plus the
 * forest artwork drawn on top of them (physics shape != visual shape).
 */
export function buildLevel(scene: Phaser.Scene, level: LevelDef): BuiltLevel {
  const solids = scene.physics.add.staticGroup();
  const platforms = scene.physics.add.staticGroup();

  for (const t of level.terrain) {
    drawTerrainBlock(scene, t, level);
    solids.add(scene.add.zone(t.x, t.top, t.width, level.height - t.top + SOLID_EXTRA_DEPTH).setOrigin(0));
  }

  drawRavines(scene, level);

  for (const p of level.platforms) {
    drawPlatform(scene, p);
    const zone = scene.add.zone(p.x, p.y, p.width, PLATFORM_BODY_HEIGHT).setOrigin(0);
    platforms.add(zone);
    const body = zone.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  const decorations = new DecorationPlacer(scene, level);
  decorations.placeAll();

  for (const light of level.lights) {
    const shaft = scene.add
      .image(light.x, light.y, FxTextures.lightShaft)
      .setOrigin(0.5, 1)
      .setDisplaySize(light.width, light.height)
      .setAlpha(LIGHT_ALPHA)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ForestDepth.groundDecorBack);
    scene.tweens.add({ targets: shaft, alpha: LIGHT_ALPHA * 0.6, duration: LIGHT_SWAY_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  const finishZone = scene.add.zone(level.finish.x, level.finish.y - FINISH_ZONE_HEIGHT / 2, FINISH_ZONE_WIDTH, FINISH_ZONE_HEIGHT);
  scene.physics.add.existing(finishZone, true);

  return { solids, platforms, finishZone, decorations };
}
