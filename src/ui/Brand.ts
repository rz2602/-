import Phaser from 'phaser';
import { AssetKeys, DEPTH } from '../config/constants';

/**
 * OFFICIAL MISHKONTIN BRAND ASSETS - screen-space UI only.
 *
 * The wordmark and emblem are official artwork (art/masters/branding/). They
 * are only ever placed as images: never re-typed with a font, recoloured,
 * stretched, cropped or given material effects. Scaling is always uniform
 * (aspect ratio preserved) and fitted inside a box, so they can't touch the
 * screen edges or overlap other UI. Scroll factor 0: not part of the world,
 * the parallax or the physics, and not listed in any world asset manifest.
 */
export interface BrandBox {
  /** Centre x / top y of the box, logical px. */
  centerX: number;
  top: number;
  maxWidth: number;
  maxHeight: number;
}

function fitScale(scene: Phaser.Scene, key: string, box: BrandBox): number {
  const frame = scene.textures.getFrame(key);
  return Math.min(box.maxWidth / frame.width, box.maxHeight / frame.height);
}

/** Main Menu title. Returns the image (origin top-centre). */
export function addWordmark(scene: Phaser.Scene, box: BrandBox, depth: number = DEPTH.hud): Phaser.GameObjects.Image {
  return scene.add
    .image(box.centerX, box.top, AssetKeys.brandWordmark)
    .setOrigin(0.5, 0)
    .setScale(fitScale(scene, AssetKeys.brandWordmark, box))
    .setScrollFactor(0)
    .setDepth(depth);
}

/** Boot/Loading mark. Returns the image (origin centre). */
export function addEmblem(scene: Phaser.Scene, centerX: number, centerY: number, size: number, depth: number = DEPTH.hud): Phaser.GameObjects.Image {
  const box = { centerX, top: centerY - size / 2, maxWidth: size, maxHeight: size };
  return scene.add
    .image(centerX, centerY, AssetKeys.brandEmblem)
    .setOrigin(0.5)
    .setScale(fitScale(scene, AssetKeys.brandEmblem, box))
    .setScrollFactor(0)
    .setDepth(depth);
}
