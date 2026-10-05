import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SUN_SHAFTS } from '../config/constants';
import { ForestBackdrop } from '../levels/forest/ForestBackdrop';
import { forestAnchor } from '../levels/forest/forestAssets';
import { ForestDepth } from '../levels/forest/forestLayers';
import { FxTextures } from '../levels/forest/forestFx';
import { getProductionAsset } from '../levels/forest/productionAssets';

/** Ground line of the menu scenes (Mishkontin stands on it). */
export const MENU_GROUND_Y = 600;
const CAP_SCALE = 1.35;
const MENU_BACKDROP_RISE = 160;
/** Sirengrad sits at the right, clear of the centred wordmark. */
const MENU_SIRENGRAD_X = 1150;
const MENU_OAK = { key: 'tree_oak_02', x: 1150, height: 520 } as const;

/** Static forest backdrop for menu scenes, using the same independent layers as the game. */
export function addMenuBackdrop(scene: Phaser.Scene): void {
  // A virtual camera "risen" a little lowers the background so the forest meets the menu ground.
  new ForestBackdrop(scene, {
    worldWidth: GAME_WIDTH,
    cameraBottom: GAME_HEIGHT + MENU_BACKDROP_RISE,
    sirengradScreenX: MENU_SIRENGRAD_X,
    // The approved menu look: ungraded layers, full sunlight.
    grading: false,
    sunShaftAlpha: SUN_SHAFTS.menuAlpha,
    backgroundSet: 'approved-menu',
  }).update(scene.cameras.main);

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

  const oak = getProductionAsset(scene, MENU_OAK.key);
  const oakFrame = scene.textures.getFrame(MENU_OAK.key);
  scene.add
    .image(MENU_OAK.x, MENU_GROUND_Y, MENU_OAK.key)
    .setOrigin(oak?.anchor?.x ?? 0.5, oak?.anchor?.y ?? 1)
    .setScale(MENU_OAK.height / oakFrame.height)
    .setDepth(ForestDepth.groundDecorBack);
  scene.add.image(90, MENU_GROUND_Y + 4, 'lantern_post').setOrigin(0.5, 1).setScale(1.6).setDepth(ForestDepth.groundDecor);
  scene.add.image(380, MENU_GROUND_Y + 4, 'flowers_white').setOrigin(0.5, 1).setScale(1.3).setDepth(ForestDepth.groundDecor);
  scene.add.image(930, MENU_GROUND_Y + 4, 'mushroom_red').setOrigin(0.5, 1).setScale(1.3).setDepth(ForestDepth.groundDecor);
}
