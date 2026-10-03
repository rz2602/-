import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, SceneKeys, STRINGS, UI_COLORS, UI_FONT_FAMILY } from '../config/constants';
import { SaveSystem } from '../systems/SaveSystem';
import { MenuList } from '../ui/MenuList';
import { addMenuBackdrop } from '../ui/menuBackdrop';

/** Minimal v0.1 settings: developer info, fullscreen, reset progress. */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Settings);
  }

  create(): void {
    addMenuBackdrop(this);
    this.add
      .text(GAME_WIDTH / 2, 110, STRINGS.settingsTitle, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '60px',
        fontStyle: 'bold',
        color: UI_COLORS.title,
        stroke: UI_COLORS.titleStroke,
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    const onOff = (value: boolean) => (value ? STRINGS.on : STRINGS.off);
    const status = this.add
      .text(GAME_WIDTH / 2, 640, '', { fontFamily: UI_FONT_FAMILY, fontSize: '24px', color: UI_COLORS.toast })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    const menu = new MenuList(this, GAME_WIDTH / 2, 230, [
      {
        label: () => `${STRINGS.debugSetting}: ${onOff(SaveSystem.settings.debugMode)}`,
        onSelect: () => SaveSystem.updateSettings({ debugMode: !SaveSystem.settings.debugMode }),
      },
      {
        label: () => `${STRINGS.fullscreenSetting}: ${onOff(this.scale.isFullscreen)}`,
        onSelect: () => this.scale.toggleFullscreen(),
      },
      {
        label: STRINGS.resetProgress,
        onSelect: () => {
          SaveSystem.resetProgress();
          status.setText(STRINGS.progressReset);
        },
      },
      { label: STRINGS.back, onSelect: () => this.scene.start(SceneKeys.MainMenu) },
    ]);
    // Fullscreen changes asynchronously; refresh the label when it happens.
    const refresh = () => menu.refreshLabels();
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, refresh);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, refresh);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, refresh);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, refresh);
    });

    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start(SceneKeys.MainMenu));
  }
}
