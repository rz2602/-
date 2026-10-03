import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { PlaceholderTextures } from '../utils/placeholderArt';

/** Static woodland backdrop for menu scenes (placeholder art). */
export function addMenuBackdrop(scene: Phaser.Scene): void {
  scene.add.image(0, 0, PlaceholderTextures.sky).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.skyBackground);
  scene.add.tileSprite(0, 300, GAME_WIDTH, 320, PlaceholderTextures.hillsFar).setOrigin(0).setDepth(DEPTH.farBackground);
  scene.add.tileSprite(0, 0, GAME_WIDTH, 512, PlaceholderTextures.sunbeams).setOrigin(0).setDepth(DEPTH.farBackground + 1).setAlpha(0.8);
  scene.add.tileSprite(0, 330, GAME_WIDTH, 420, PlaceholderTextures.treesMid).setOrigin(0).setDepth(DEPTH.midBackground);
  scene.add.tileSprite(0, 600, GAME_WIDTH, 128, PlaceholderTextures.soil).setOrigin(0).setDepth(DEPTH.terrain);
  scene.add.tileSprite(0, 590, GAME_WIDTH, 40, PlaceholderTextures.grass).setOrigin(0).setDepth(DEPTH.terrain + 1);
}
