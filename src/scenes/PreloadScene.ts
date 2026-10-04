import Phaser from 'phaser';
import { AssetKeys, AssetPaths, BOOT, GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/constants';
import { getMishkontinManifest, registerMishkontinAnimations } from '../entities/mishkontinAnimations';
import { getForestManifest } from '../levels/forest/forestAssets';
import { generateForestFx } from '../levels/forest/forestFx';
import { getProductionManifest, supersededLegacyKeys } from '../levels/forest/productionAssets';
import { addEmblem } from '../ui/Brand';
import { assetSource } from '../utils/assetSource';
import { generatePlaceholderArt } from '../utils/placeholderArt';

/**
 * Boot / loading presentation: deep forest-green screen, the official emblem
 * fades in while the real assets load, a thin progress line appears only if
 * loading takes noticeably long, then a fade to the Main Menu.
 * Total ~1-2 s; once loading is done any key or click skips the wait.
 */
export class PreloadScene extends Phaser.Scene {
  private loaded = false;
  private leaving = false;
  private shownAt = 0;

  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    this.loaded = false;
    this.leaving = false;
    this.shownAt = performance.now();
    this.createLoadingScreen();

    // Frame size comes from the preprocessing manifest (see tools/build-mishkontin-atlas.mjs).
    const manifest = getMishkontinManifest(this);
    this.load.spritesheet(AssetKeys.mishkontin, assetSource(AssetPaths.mishkontinFrames), {
      frameWidth: manifest.frameWidth,
      frameHeight: manifest.frameHeight,
    });

    // High-resolution production art (tools/build-production-assets.mjs) ...
    for (const [key, entry] of Object.entries(getProductionManifest(this).assets)) {
      this.load.image(key, assetSource(entry.path));
    }
    // ... and the legacy forest-kit pieces it has not replaced yet.
    const superseded = supersededLegacyKeys(this);
    for (const [key, entry] of Object.entries(getForestManifest(this).assets)) {
      if (!superseded.has(key)) this.load.image(key, assetSource(entry.path));
    }

    this.load.image(AssetKeys.brandWordmark, assetSource(AssetPaths.brandWordmark));
  }

  create(): void {
    generatePlaceholderArt(this);
    generateForestFx(this);
    registerMishkontinAnimations(this, getMishkontinManifest(this));
    this.loaded = true;

    const remaining = Math.max(0, BOOT.minimumShowMs - (performance.now() - this.shownAt));
    this.time.delayedCall(remaining, () => this.toMenu());
    this.input.keyboard?.once('keydown', () => this.toMenu());
    this.input.once(Phaser.Input.Events.POINTER_UP, () => this.toMenu());
  }

  private createLoadingScreen(): void {
    this.cameras.main.setBackgroundColor(BOOT.background);
    const emblem = addEmblem(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, BOOT.emblemSize).setAlpha(0);
    this.tweens.add({ targets: emblem, alpha: 1, duration: BOOT.fadeInMs, ease: 'Sine.easeOut' });

    // Thin progress line, only if loading is slow enough to be worth showing.
    const lineY = GAME_HEIGHT / 2 + BOOT.emblemSize / 2 + 28;
    const track = this.add.rectangle(GAME_WIDTH / 2, lineY, BOOT.barWidth, 2, BOOT.barTrack).setAlpha(0);
    const fill = this.add.rectangle(GAME_WIDTH / 2 - BOOT.barWidth / 2, lineY, 1, 2, BOOT.barFill).setOrigin(0, 0.5).setAlpha(0);
    this.time.delayedCall(BOOT.showProgressAfterMs, () => {
      if (this.loaded) return;
      this.tweens.add({ targets: [track, fill], alpha: 0.8, duration: 250 });
    });
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      fill.width = Math.max(1, BOOT.barWidth * value);
    });
  }

  private toMenu(): void {
    if (!this.loaded || this.leaving) return;
    this.leaving = true;
    const camera = this.cameras.main;
    camera.fade(BOOT.fadeOutMs, 0x0b, 0x14, 0x0e, true);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SceneKeys.MainMenu));
  }
}
