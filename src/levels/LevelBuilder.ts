import Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import { PlaceholderTextures } from '../utils/placeholderArt';
import type { DecorationKind, LevelDef } from './LevelTypes';

const GRASS_OVERHANG_Y = 10; // grass texture draws this far above the collision top
const SOIL_EXTRA_DEPTH = 200; // soil continues below the world so pits never show its end
const PLATFORM_VISUAL_HEIGHT = 28;
const PLATFORM_BODY_HEIGHT = 16;
const SCATTER_SPACING = 260;
const SCATTER_EDGE_MARGIN = 80;
const FINISH_ZONE_WIDTH = 60;
const FINISH_ZONE_HEIGHT = 240;

const DECORATION_TEXTURES: Record<DecorationKind, string> = {
  tree: PlaceholderTextures.tree,
  bush: PlaceholderTextures.bush,
  mushroom: PlaceholderTextures.mushroom,
  signArrow: PlaceholderTextures.signArrow,
  signCaution: PlaceholderTextures.signCaution,
};

export interface BuiltLevel {
  /** Solid ground (collides on all sides). */
  solids: Phaser.Physics.Arcade.StaticGroup;
  /** One-way platforms (collide only from above). */
  platforms: Phaser.Physics.Arcade.StaticGroup;
  finishZone: Phaser.GameObjects.Zone;
}

/** Turns a LevelDef into game objects and static physics bodies. */
export function buildLevel(scene: Phaser.Scene, level: LevelDef): BuiltLevel {
  const solids = scene.physics.add.staticGroup();
  const platforms = scene.physics.add.staticGroup();

  for (const t of level.terrain) {
    const soilHeight = level.height - t.top + SOIL_EXTRA_DEPTH;
    const soil = scene.add
      .tileSprite(t.x, t.top, t.width, soilHeight, PlaceholderTextures.soil)
      .setOrigin(0, 0)
      .setDepth(DEPTH.terrain);
    scene.add
      .tileSprite(t.x, t.top - GRASS_OVERHANG_Y, t.width, 40, PlaceholderTextures.grass)
      .setOrigin(0, 0)
      .setDepth(DEPTH.terrain + 1);
    solids.add(soil);
  }

  for (const p of level.platforms) {
    const plank = scene.add
      .tileSprite(p.x, p.y, p.width, PLATFORM_VISUAL_HEIGHT, PlaceholderTextures.platform)
      .setOrigin(0, 0)
      .setDepth(DEPTH.terrain);
    platforms.add(plank);
    const body = plank.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(p.width, PLATFORM_BODY_HEIGHT, false);
    body.setOffset(0, 0);
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  scatterVegetation(scene, level);

  for (const d of level.decorations) {
    scene.add
      .image(d.x, d.y, DECORATION_TEXTURES[d.kind])
      .setOrigin(0.5, 1)
      .setScale(d.scale ?? 1)
      .setFlipX(d.flipX ?? false)
      .setDepth(d.kind === 'tree' ? DEPTH.backgroundProps : DEPTH.props);
  }

  scene.add.image(level.finish.x, level.finish.y + 4, PlaceholderTextures.finish).setOrigin(0.5, 1).setDepth(DEPTH.props);
  const finishZone = scene.add.zone(level.finish.x, level.finish.y - FINISH_ZONE_HEIGHT / 2, FINISH_ZONE_WIDTH, FINISH_ZONE_HEIGHT);
  scene.physics.add.existing(finishZone, true);

  return { solids, platforms, finishZone };
}

/** Deterministic bushes and small trees along chosen ground segments. */
function scatterVegetation(scene: Phaser.Scene, level: LevelDef): void {
  const rand = new Phaser.Math.RandomDataGenerator([level.id]);
  for (const index of level.scatterOn) {
    const t = level.terrain[index];
    if (!t) continue;
    for (let x = t.x + SCATTER_EDGE_MARGIN; x < t.x + t.width - SCATTER_EDGE_MARGIN; x += SCATTER_SPACING) {
      const px = x + rand.between(-60, 60);
      if (rand.frac() < 0.35) {
        scene.add
          .image(px, t.top + 12, PlaceholderTextures.tree)
          .setOrigin(0.5, 1)
          .setScale(rand.realInRange(0.55, 0.8))
          .setAlpha(0.9)
          .setTint(0xc9d8b8)
          .setDepth(DEPTH.backgroundProps - 1);
      } else {
        scene.add
          .image(px, t.top + 6, PlaceholderTextures.bush)
          .setOrigin(0.5, 1)
          .setScale(rand.realInRange(0.6, 1))
          .setDepth(DEPTH.props);
      }
    }
  }
}
