import Phaser from 'phaser';

/**
 * Measures how much every raster texture in a scene is magnified on screen,
 * to enforce the art rule "never render an asset above ~125% of its native
 * size". Procedural effect textures (gradients, glows) and text are skipped:
 * smooth gradients do not lose detail when stretched.
 */
export const MAX_ALLOWED_MAGNIFICATION = 1.25;
/** Reference displays used for recommendations. */
const REFERENCE_SCALES = { qhd: 2, uhd: 3 } as const;
const SKIP_PREFIXES = ['fx-', 'ph-', '__'];

export interface AssetScaleRow {
  key: string;
  nativeWidth: number;
  nativeHeight: number;
  /** Largest texture-px -> logical-px scale this texture is drawn at. */
  logicalScale: number;
  /** Magnification on screen at the current render scale. */
  magnification: number;
  /** Magnification at 2560x1440 (render scale 2). */
  magnificationQhd: number;
  ok: boolean;
  /** Tiled with a non power-of-two size: Phaser stretches it to POT first (extra resampling). */
  nonPowerOfTwoTile: boolean;
  /** Source size so the largest use is <= 100% at 2560x1440 / at 3840x2160. */
  sourceForQhd: [number, number];
  sourceForUhd: [number, number];
}

export function auditAssetScale(scene: Phaser.Scene, renderScale: number): AssetScaleRow[] {
  const maxScale = new Map<string, { scale: number; frame: Phaser.Textures.Frame }>();
  const nonPot = new Set<string>();
  const visit = (obj: Phaser.GameObjects.GameObject) => {
    let scale = 0;
    let frame: Phaser.Textures.Frame | undefined;
    if (obj instanceof Phaser.GameObjects.TileSprite) {
      // A TileSprite's own `frame` is an internal canvas; the art is its displayFrame.
      scale = Math.max(Math.abs(obj.tileScaleX), Math.abs(obj.tileScaleY));
      frame = (obj as unknown as { displayFrame: Phaser.Textures.Frame }).displayFrame;
      if (frame && (!isPowerOfTwo(frame.realWidth) || !isPowerOfTwo(frame.realHeight))) nonPot.add(frame.texture.key);
    } else if (obj instanceof Phaser.GameObjects.Image || obj instanceof Phaser.GameObjects.Sprite) {
      scale = Math.max(Math.abs(obj.scaleX), Math.abs(obj.scaleY));
      frame = obj.frame;
    } else if (obj instanceof Phaser.GameObjects.Container) {
      obj.list.forEach(visit);
      return;
    }
    if (!frame) return;
    const key = frame.texture.key;
    if (SKIP_PREFIXES.some((p) => key.startsWith(p))) return;
    const prev = maxScale.get(key);
    if (!prev || scale > prev.scale) maxScale.set(key, { scale, frame });
  };
  scene.children.list.forEach(visit);

  const rows: AssetScaleRow[] = [];
  for (const [key, { scale, frame }] of maxScale) {
    const w = frame.realWidth;
    const h = frame.realHeight;
    const qhd = scale * REFERENCE_SCALES.qhd;
    rows.push({
      key,
      nativeWidth: w,
      nativeHeight: h,
      logicalScale: round(scale),
      magnification: round(scale * renderScale),
      magnificationQhd: round(qhd),
      ok: qhd <= MAX_ALLOWED_MAGNIFICATION,
      nonPowerOfTwoTile: nonPot.has(key),
      sourceForQhd: [Math.ceil(w * qhd), Math.ceil(h * qhd)],
      sourceForUhd: [Math.ceil(w * scale * REFERENCE_SCALES.uhd), Math.ceil(h * scale * REFERENCE_SCALES.uhd)],
    });
  }
  return rows.sort((a, b) => b.magnificationQhd - a.magnificationQhd);
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
