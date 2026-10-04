import Phaser from 'phaser';
import { AssetKeys } from '../../config/constants';

/**
 * High-resolution production world art (v0.1.1 Ultra Detail pass), generated
 * from art/masters/** by tools/build-production-assets.mjs and listed in
 * public/assets/production-assets.json. Brand assets are NOT listed here -
 * they are screen-space UI (see src/ui/Brand.ts).
 *
 * All anchors are NORMALIZED (0..1 of the runtime texture), so a future
 * re-export at another resolution keeps its placement.
 */
export interface ProductionAsset {
  path: string;
  role: 'layer' | 'tree' | 'water';
  width: number;
  height: number;
  master: string;
  masterSize: [number, number];
  masterSha256: string;
  /** Ground-contact point (trees, waterfall), normalized. */
  anchor?: { x: number; y: number };
  /** Parallax layers: rows with >= 50% opaque coverage, normalized. */
  contentBand?: { top: number; bottom: number };
  /** Parallax layers: columns where the layer is not tapered, normalized. */
  solidColumns?: { left: number; right: number };
  /** Mountains: columns [0, castleFreeEnd) contain no castle, normalized. */
  castleFreeEnd?: number;
  /** Legacy forest-kit keys replaced by this asset (no longer loaded). */
  supersedes?: string[];
}

export interface ProductionManifest {
  displayFactor: number;
  assets: Record<string, ProductionAsset>;
}

export const ProductionKeys = {
  sky: 'bg_layer_sky',
  mountains: 'bg_layer_mountains',
  forestDistant: 'bg_layer_forest_distant',
  forestMid: 'bg_layer_forest_mid',
  waterfall: 'waterfall_01',
} as const;

export function getProductionManifest(scene: Phaser.Scene): ProductionManifest {
  return scene.cache.json.get(AssetKeys.productionManifest) as ProductionManifest;
}

export function getProductionAsset(scene: Phaser.Scene, key: string): ProductionAsset | undefined {
  return getProductionManifest(scene)?.assets[key];
}

/** Legacy forest-kit keys that production art has replaced. */
export function supersededLegacyKeys(scene: Phaser.Scene): Set<string> {
  const keys = new Set<string>();
  for (const asset of Object.values(getProductionManifest(scene)?.assets ?? {})) {
    for (const key of asset.supersedes ?? []) keys.add(key);
  }
  return keys;
}
