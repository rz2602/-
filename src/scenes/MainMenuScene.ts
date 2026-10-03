import Phaser from 'phaser';
import { AssetKeys, DEPTH, GAME_WIDTH, SceneKeys, STRINGS, UI_COLORS, UI_FONT_FAMILY } from '../config/constants';
import { getMishkontinManifest, MishkontinAnims } from '../entities/mishkontinAnimations';
import { MenuList } from '../ui/MenuList';
import { addMenuBackdrop } from '../ui/menuBackdrop';

/** Temporary main menu: title, Mishkontin idling, PLAY and SETTINGS. */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.MainMenu);
  }

  private leaving = false;

  create(): void {
    this.leaving = false;
    addMenuBackdrop(this);

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: UI_FONT_FAMILY,
      fontStyle: 'bold',
      color: UI_COLORS.title,
      stroke: UI_COLORS.titleStroke,
      align: 'center',
    };
    this.add
      .text(GAME_WIDTH / 2, 120, STRINGS.title, { ...titleStyle, fontSize: '84px', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.add
      .text(GAME_WIDTH / 2, 200, STRINGS.subtitle, { ...titleStyle, fontSize: '38px', strokeThickness: 7 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    const { anchor } = getMishkontinManifest(this);
    this.add
      .sprite(330, 600, AssetKeys.mishkontin)
      .setOrigin(anchor.originX, anchor.originY)
      .setScale(1.25)
      .setDepth(DEPTH.player)
      .play(MishkontinAnims.idle);

    new MenuList(this, GAME_WIDTH / 2 + 160, 360, [
      { label: STRINGS.play, onSelect: () => this.startGame() },
      { label: STRINGS.settings, onSelect: () => this.scene.start(SceneKeys.Settings) },
    ]);

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private startGame(): void {
    if (this.leaving) return;
    this.leaving = true;
    const camera = this.cameras.main;
    camera.fade(250, 0, 0, 0, true);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SceneKeys.ForestTest));
  }
}
