import Phaser from 'phaser';
import { AssetKeys, AssetPaths, GAME_HEIGHT, GAME_WIDTH, SceneKeys, UI_COLORS, UI_FONT_FAMILY } from '../config/constants';
import { getMishkontinManifest, registerMishkontinAnimations } from '../entities/mishkontinAnimations';
import { assetSource } from '../utils/assetSource';
import { generatePlaceholderArt } from '../utils/placeholderArt';

const BAR_WIDTH = 420;
const BAR_HEIGHT = 14;

/** Loads all game assets with a simple progress bar, then registers animations. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    this.createProgressBar();

    // Frame size comes from the preprocessing manifest (see tools/build-mishkontin-atlas.mjs).
    const manifest = getMishkontinManifest(this);
    this.load.spritesheet(AssetKeys.mishkontin, assetSource(AssetPaths.mishkontinFrames), {
      frameWidth: manifest.frameWidth,
      frameHeight: manifest.frameHeight,
    });
  }

  create(): void {
    generatePlaceholderArt(this);
    registerMishkontinAnimations(this, getMishkontinManifest(this));
    this.scene.start(SceneKeys.MainMenu);
  }

  private createProgressBar(): void {
    const x = (GAME_WIDTH - BAR_WIDTH) / 2;
    const y = GAME_HEIGHT / 2;
    this.add
      .text(GAME_WIDTH / 2, y - 40, 'Мишконтин', {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '32px',
        color: UI_COLORS.title,
      })
      .setOrigin(0.5);
    this.add.rectangle(x, y, BAR_WIDTH, BAR_HEIGHT, 0x3b2a16).setOrigin(0, 0.5);
    const fill = this.add.rectangle(x, y, 1, BAR_HEIGHT, 0xffd36b).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      fill.width = Math.max(1, BAR_WIDTH * value);
    });
  }
}
