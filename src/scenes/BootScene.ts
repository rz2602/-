import Phaser from 'phaser';
import { AssetKeys, AssetPaths, SceneKeys } from '../config/constants';

/** Loads the small metadata PreloadScene needs to know how to load everything else. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    this.load.json(AssetKeys.mishkontinManifest, AssetPaths.mishkontinManifest);
  }

  create(): void {
    this.scene.start(SceneKeys.Preload);
  }
}
