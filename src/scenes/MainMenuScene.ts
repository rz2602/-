import Phaser from 'phaser';
import { AssetKeys, DEPTH, GAME_WIDTH, MENU_LAYOUT, SceneKeys, STRINGS, UI_COLORS, UI_FONT_FAMILY } from '../config/constants';
import { getMishkontinManifest, MishkontinAnims } from '../entities/mishkontinAnimations';
import { addWordmark } from '../ui/Brand';
import { MenuList } from '../ui/MenuList';
import { addMenuBackdrop, MENU_GROUND_Y } from '../ui/menuBackdrop';

/**
 * Title screen. Hierarchy: official wordmark -> subtitle -> ИГРАЙ ->
 * НАСТРОЙКИ -> illustrated environment, with Mishkontin idling at the side.
 */
export class MainMenuScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super(SceneKeys.MainMenu);
  }

  create(): void {
    this.leaving = false;
    addMenuBackdrop(this);

    const wordmark = addWordmark(this, {
      centerX: GAME_WIDTH / 2,
      top: MENU_LAYOUT.wordmarkTop,
      maxWidth: MENU_LAYOUT.wordmarkMaxWidth,
      maxHeight: MENU_LAYOUT.wordmarkMaxHeight,
    });

    this.add
      .text(GAME_WIDTH / 2, wordmark.y + wordmark.displayHeight + MENU_LAYOUT.subtitleGap, STRINGS.subtitle, {
        fontFamily: UI_FONT_FAMILY,
        fontStyle: 'bold',
        fontSize: '34px',
        color: UI_COLORS.title,
        stroke: UI_COLORS.titleStroke,
        strokeThickness: 7,
        letterSpacing: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud);

    const { anchor } = getMishkontinManifest(this);
    this.add
      .sprite(MENU_LAYOUT.mishkontinX, MENU_GROUND_Y, AssetKeys.mishkontin)
      .setOrigin(anchor.originX, anchor.originY)
      .setScale(1.25)
      .setDepth(DEPTH.player)
      .play(MishkontinAnims.idle);

    new MenuList(this, GAME_WIDTH / 2, MENU_LAYOUT.buttonsTop, [
      { label: STRINGS.play, onSelect: () => this.startGame() },
      { label: STRINGS.settings, onSelect: () => this.scene.start(SceneKeys.Settings) },
    ]);

    this.cameras.main.fadeIn(350, 0x0b, 0x14, 0x0e);
  }

  private startGame(): void {
    if (this.leaving) return;
    this.leaving = true;
    const camera = this.cameras.main;
    camera.fade(250, 0, 0, 0, true);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SceneKeys.ForestTest));
  }
}
