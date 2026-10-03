import Phaser from 'phaser';
import { AssetKeys, AssetPaths, SceneKeys } from '../config/constants';
import { jsonAssetSource } from '../utils/assetSource';

/** Loads the small metadata PreloadScene needs to know how to load everything else. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    this.load.json(AssetKeys.mishkontinManifest, jsonAssetSource(AssetPaths.mishkontinManifest));
    this.load.json(AssetKeys.forestManifest, jsonAssetSource(AssetPaths.forestManifest));
  }

  create(): void {
    this.scene.start(SceneKeys.Preload);
  }
}
