import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, SceneKeys, STRINGS, UI_COLORS, UI_FONT_FAMILY } from '../config/constants';
import { MenuList } from '../ui/MenuList';

/** Overlay launched on top of a paused gameplay scene. */
export class PauseScene extends Phaser.Scene {
  private gameplayKey: string = SceneKeys.ForestTest;

  constructor() {
    super(SceneKeys.Pause);
  }

  init(data: { gameplayKey?: string }): void {
    this.gameplayKey = data.gameplayKey ?? SceneKeys.ForestTest;
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c1008, 0.6).setOrigin(0).setDepth(DEPTH.overlay);
    this.add
      .text(GAME_WIDTH / 2, 200, STRINGS.paused, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '64px',
        fontStyle: 'bold',
        color: UI_COLORS.title,
        stroke: UI_COLORS.titleStroke,
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 1);

    new MenuList(
      this,
      GAME_WIDTH / 2,
      340,
      [
        { label: STRINGS.resume, onSelect: () => this.resumeGame() },
        { label: STRINGS.mainMenu, onSelect: () => this.toMainMenu() },
      ],
      DEPTH.overlay + 2,
    );

    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.resumeGame());
  }

  private resumeGame(): void {
    this.scene.resume(this.gameplayKey);
    this.scene.stop();
  }

  private toMainMenu(): void {
    this.scene.stop(this.gameplayKey);
    this.scene.start(SceneKeys.MainMenu);
  }
}
