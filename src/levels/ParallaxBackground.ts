import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { PlaceholderTextures } from '../utils/placeholderArt';

interface Layer {
  sprite: Phaser.GameObjects.TileSprite;
  factorX: number;
  factorY: number;
  baseY: number;
}

/**
 * Screen-fixed tile sprites scrolled by a fraction of the camera movement.
 * Only tile offsets change per frame, so this costs almost nothing.
 */
export class ParallaxBackground {
  private readonly layers: Layer[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cameraBottom: number,
  ) {
    scene.add
      .image(0, 0, PlaceholderTextures.sky)
      .setOrigin(0, 0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(DEPTH.skyBackground);

    this.addLayer(PlaceholderTextures.hillsFar, 320, 0.15, 0.08, 330, DEPTH.farBackground);
    this.addLayer(PlaceholderTextures.sunbeams, 512, 0.25, 0.1, 0, DEPTH.farBackground + 1, 0.8);
    this.addLayer(PlaceholderTextures.treesMid, 420, 0.4, 0.2, 360, DEPTH.midBackground);
  }

  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    // 0 when the camera is at the bottom of the world, growing as it rises.
    const rise = this.cameraBottom - GAME_HEIGHT - camera.scrollY;
    for (const layer of this.layers) {
      layer.sprite.tilePositionX = camera.scrollX * layer.factorX;
      layer.sprite.y = layer.baseY + rise * layer.factorY;
    }
  }

  private addLayer(
    key: string,
    height: number,
    factorX: number,
    factorY: number,
    baseY: number,
    depth: number,
    alpha = 1,
  ): void {
    const sprite = this.scene.add
      .tileSprite(0, baseY, GAME_WIDTH, height, key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth)
      .setAlpha(alpha);
    this.layers.push({ sprite, factorX, factorY, baseY });
  }
}
