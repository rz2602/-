import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { ForestBackdrop } from '../levels/forest/ForestBackdrop';
import { forestAnchor } from '../levels/forest/forestAssets';
import { ForestDepth } from '../levels/forest/forestLayers';
import { FxTextures } from '../levels/forest/forestFx';

/** Ground line of the menu scenes (Mishkontin stands on it). */
export const MENU_GROUND_Y = 600;
const CAP_SCALE = 1.35;
const MENU_BACKDROP_RISE = 160;

/** Static forest backdrop for menu scenes, using the same layers as the game. */
export function addMenuBackdrop(scene: Phaser.Scene): void {
  // A virtual camera "risen" a little lowers the background so the forest meets the menu ground.
  new ForestBackdrop(scene, { worldWidth: GAME_WIDTH, cameraBottom: GAME_HEIGHT + MENU_BACKDROP_RISE }).update(scene.cameras.main);

  const capTop = MENU_GROUND_Y - forestAnchor(scene, 'terrain_cap', 'walkY', [0, 14])[1] * CAP_SCALE;
  const capHeight = scene.textures.getFrame('terrain_cap').height * CAP_SCALE;
  scene.add
    .tileSprite(0, capTop + capHeight * 0.6, GAME_WIDTH, GAME_HEIGHT, FxTextures.soil)
    .setOrigin(0)
    .setTileScale(CAP_SCALE)
    .setTint(0xb9a690)
    .setDepth(ForestDepth.terrainFill);
  scene.add
    .tileSprite(0, capTop, GAME_WIDTH, capHeight, 'terrain_cap')
    .setOrigin(0)
    .setTileScale(CAP_SCALE)
    .setDepth(ForestDepth.terrainCap);
  scene.add.image(1180, MENU_GROUND_Y + 4, 'tree_large_02').setOrigin(0.5, 1).setScale(2.1).setDepth(ForestDepth.groundDecorBack);
  scene.add.image(170, MENU_GROUND_Y + 4, 'lantern_post').setOrigin(0.5, 1).setScale(1.6).setDepth(ForestDepth.groundDecor);
  scene.add.image(470, MENU_GROUND_Y + 4, 'flowers_white').setOrigin(0.5, 1).setScale(1.3).setDepth(ForestDepth.groundDecor);
  scene.add.image(560, MENU_GROUND_Y + 4, 'mushroom_red').setOrigin(0.5, 1).setScale(1.3).setDepth(ForestDepth.groundDecor);
}
