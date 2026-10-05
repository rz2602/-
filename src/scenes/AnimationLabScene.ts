import Phaser from 'phaser';
import { AssetKeys, GAME_HEIGHT, GAME_WIDTH, PLAYER_BODY, PLAYER_SCALE, SceneKeys } from '../config/constants';
import { getMishkontinV2Manifest, V2_ANIMATION_KEYS } from '../entities/mishkontinAnimations';

const COLUMNS = 6;
const CELL_W = GAME_WIDTH / COLUMNS;
const CELL_H = 228;
const GROUND_FROM_TOP = 190;

/**
 * DEVELOPER-ONLY animation gallery for the Mishkontin V2 set (`?animlab`).
 * Every animation plays in its own cell at gameplay scale on a ground line,
 * with the foot anchor (cross) and the gameplay collision body (box).
 * F = flip all, SPACE = pause/resume, 1-9 = speed x0.25..x2.25, ESC = main menu.
 * Never reachable from the game's menus.
 */
export class AnimationLabScene extends Phaser.Scene {
  private sprites: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super(SceneKeys.AnimationLab);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#3d4f5f');
    const manifest = getMishkontinV2Manifest(this);
    const scale = 1 / manifest.runtimePxPerLogical;
    const unit = PLAYER_SCALE / scale;
    const g = this.add.graphics();

    V2_ANIMATION_KEYS.forEach((key, i) => {
      const cx = (i % COLUMNS) * CELL_W + CELL_W / 2;
      const top = Math.floor(i / COLUMNS) * CELL_H;
      const ground = top + GROUND_FROM_TOP;
      g.lineStyle(1, 0x9fb6c8, 0.6).lineBetween(cx - CELL_W / 2 + 8, ground, cx + CELL_W / 2 - 8, ground);
      const sprite = this.add
        .sprite(cx, ground, AssetKeys.mishkontinV2)
        .setOrigin(manifest.anchor.x / manifest.cell.width, manifest.anchor.y / manifest.cell.height)
        .setScale(scale)
        .play({ key, repeat: -1 });
      this.sprites.push(sprite);
      // Collision body (same logical size as in gameplay) and foot anchor.
      g.lineStyle(1, 0xffd36b, 0.9).strokeRect(cx - (PLAYER_BODY.width * unit * scale) / 2, ground - PLAYER_BODY.standingHeight * unit * scale, PLAYER_BODY.width * unit * scale, PLAYER_BODY.standingHeight * unit * scale);
      g.lineStyle(1, 0xff4a4a, 1).lineBetween(cx - 6, ground, cx + 6, ground).lineBetween(cx, ground - 6, cx, ground + 6);
      this.add.text(cx, top + 8, key.replace('mishkontin2-', ''), { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5, 0);
    });

    this.add
      .text(GAME_WIDTH - 8, GAME_HEIGHT - 8, 'ANIMATION LAB (dev)  F flip  SPACE pause  1-9 speed  ESC menu', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffe9a8' })
      .setOrigin(1, 1);

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-F', () => this.sprites.forEach((s) => s.setFlipX(!s.flipX)));
    keyboard?.on('keydown-SPACE', () => this.sprites.forEach((s) => (s.anims.isPaused ? s.anims.resume() : s.anims.pause())));
    keyboard?.on('keydown', (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 9) this.sprites.forEach((s) => (s.anims.timeScale = n * 0.25));
    });
    keyboard?.on('keydown-ESC', () => this.scene.start(SceneKeys.MainMenu));
  }
}
