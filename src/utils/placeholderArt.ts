import Phaser from 'phaser';

/**
 * TEMPORARY PLACEHOLDER UI ART.
 *
 * Drawn on a canvas at startup. The forest environment now uses the
 * reference-derived kit art (src/levels/forest); only the menu button remains
 * a placeholder. To replace it, load an image with the same key in
 * PreloadScene - generation is skipped for existing keys.
 */
export const PlaceholderTextures = {
  button: 'ph-button',
} as const;

const GOLD = '#e8b443';

function makeTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, w, h);
  if (!texture) return;
  paint(texture.getContext());
  texture.refresh();
}

export function generatePlaceholderArt(scene: Phaser.Scene): void {
  makeTexture(scene, PlaceholderTextures.button, 360, 72, (ctx) => {
    ctx.fillStyle = 'rgba(59, 42, 22, 0.85)';
    ctx.beginPath();
    ctx.roundRect(2, 2, 356, 68, 18);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}
