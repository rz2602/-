import Phaser from 'phaser';
import { AssetKeys, AssetPaths, SceneKeys } from '../config/constants';
import { assetSource, jsonAssetSource } from '../utils/assetSource';

/**
 * Loads only what the loading screen itself needs: the asset manifests and
 * the official emblem (~0.5 MB). Everything else loads in PreloadScene while
 * the emblem is shown.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    this.load.json(AssetKeys.mishkontinManifest, jsonAssetSource(AssetPaths.mishkontinManifest));
    this.load.json(AssetKeys.forestManifest, jsonAssetSource(AssetPaths.forestManifest));
    this.load.json(AssetKeys.productionManifest, jsonAssetSource(AssetPaths.productionManifest));
    this.load.image(AssetKeys.brandEmblem, assetSource(AssetPaths.brandEmblem));
  }

  create(): void {
    this.scene.start(SceneKeys.Preload);
  }
}
