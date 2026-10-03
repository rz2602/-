import Phaser from 'phaser';
import { DEPTH, UI_COLORS, UI_FONT_FAMILY } from '../config/constants';
import { BUTTON_TEXTURE_RESOLUTION, PlaceholderTextures } from '../utils/placeholderArt';

export interface MenuItem {
  label: string | (() => string);
  onSelect: () => void;
}

const ITEM_SPACING = 86;

/**
 * Vertical list of buttons usable with mouse (hover/click) and keyboard
 * (Up/Down or W/S to move, Enter/Space to select). Used by all menus.
 */
export class MenuList {
  private readonly buttons: Array<{ bg: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; item: MenuItem }> = [];
  private focused = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    items: MenuItem[],
    depth: number = DEPTH.hud,
  ) {
    items.forEach((item, i) => {
      const by = y + i * ITEM_SPACING;
      const bg = scene.add
        .image(x, by, PlaceholderTextures.button)
        .setScrollFactor(0)
        .setDepth(depth)
        .setInteractive({ useHandCursor: true });
      const text = scene.add
        .text(x, by, '', {
          fontFamily: UI_FONT_FAMILY,
          fontSize: '32px',
          fontStyle: 'bold',
          color: UI_COLORS.button,
          stroke: UI_COLORS.buttonStroke,
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 1);
      bg.on(Phaser.Input.Events.POINTER_OVER, () => this.focus(i));
      bg.on(Phaser.Input.Events.POINTER_UP, () => this.select(i));
      this.buttons.push({ bg, text, item });
    });
    this.refreshLabels();
    this.focus(0);

    const keyboard = scene.input.keyboard;
    if (keyboard) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      for (const code of [K.UP, K.W]) keyboard.addKey(code).on('down', () => this.move(-1));
      for (const code of [K.DOWN, K.S]) keyboard.addKey(code).on('down', () => this.move(1));
      for (const code of [K.ENTER, K.SPACE]) keyboard.addKey(code).on('down', () => this.select(this.focused));
    }
  }

  /** Re-evaluates dynamic labels (e.g. ON/OFF toggles). */
  refreshLabels(): void {
    for (const b of this.buttons) {
      b.text.setText(typeof b.item.label === 'function' ? b.item.label() : b.item.label);
    }
  }

  private move(step: number): void {
    const n = this.buttons.length;
    this.focus((this.focused + step + n) % n);
  }

  private focus(index: number): void {
    this.focused = index;
    this.buttons.forEach((b, i) => {
      const on = i === index;
      b.text.setColor(on ? UI_COLORS.buttonHover : UI_COLORS.button);
      b.bg.setScale((on ? 1.05 : 1) / BUTTON_TEXTURE_RESOLUTION);
    });
  }

  private select(index: number): void {
    const button = this.buttons[index];
    if (!button) return;
    this.focus(index);
    button.item.onSelect();
    if (this.scene.sys.isActive()) this.refreshLabels();
  }
}
