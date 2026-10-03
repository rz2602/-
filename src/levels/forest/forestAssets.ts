import Phaser from 'phaser';
import { AssetKeys } from '../../config/constants';

/**
 * Forest environment textures. Produced by tools/extract-forest-kit.mjs from
 * the Forest Environment Kit reference sheet and listed in
 * public/assets/environments/forest/forest-assets.json.
 *
 * STATUS: temporary, reference-derived art (low resolution, scaled up in
 * game). Final art replaces the PNGs under the same keys.
 */
export interface ForestAssetEntry {
  path: string;
  width: number;
  height: number;
  /** Named points [x, y] or rects [x0, y0, x1, y1] in texture pixels. */
  anchors?: Record<string, number[]>;
}

export interface ForestManifest {
  status: string;
  assets: Record<string, ForestAssetEntry>;
}

export function getForestManifest(scene: Phaser.Scene): ForestManifest {
  return scene.cache.json.get(AssetKeys.forestManifest) as ForestManifest;
}

/** Anchor of a forest texture, or `fallback` when the asset defines none. */
export function forestAnchor(scene: Phaser.Scene, key: string, name: string, fallback: number[] = [0, 0]): number[] {
  return getForestManifest(scene).assets[key]?.anchors?.[name] ?? fallback;
}
