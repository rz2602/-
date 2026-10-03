import Phaser from 'phaser';
import { DEPTH, FINISH, GAME_HEIGHT, GAME_WIDTH, STRINGS, UI_COLORS, UI_FONT_FAMILY } from '../config/constants';

const TOAST_Y = 150;
const HINT_VISIBLE_MS = 6000;

/** Screen-space UI for the gameplay scene: toasts, controls hint, finish texts. */
export class HUD {
  private readonly toast: Phaser.GameObjects.Text;
  private toastTween: Phaser.Tweens.TweenChain | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.toast = scene.add
      .text(GAME_WIDTH / 2, TOAST_Y, '', {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '40px',
        fontStyle: 'bold',
        color: UI_COLORS.toast,
        stroke: UI_COLORS.titleStroke,
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setAlpha(0);

    const hint = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 28, STRINGS.controlsHint, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '18px',
        color: UI_COLORS.toast,
        stroke: UI_COLORS.titleStroke,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    scene.tweens.add({ targets: hint, alpha: 0, delay: HINT_VISIBLE_MS, duration: 800, onComplete: () => hint.destroy() });
  }

  showToast(message: string, durationMs = 1400): void {
    this.toastTween?.stop();
    this.toast.setText(message).setAlpha(0).setScale(0.9);
    this.toastTween = this.scene.tweens.chain({
      targets: this.toast,
      tweens: [
        { alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' },
        { alpha: 0, delay: durationMs, duration: 400 },
      ],
    });
  }

  /** End-of-level sequence. Resolves when the "back to menu" prompt is shown. */
  playFinishSequence(): Promise<void> {
    const scene = this.scene;
    const dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x10140c, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.overlay)
      .setAlpha(0);
    scene.tweens.add({ targets: dim, alpha: FINISH.dimAlpha, duration: FINISH.dimDurationMs });

    const line = (y: number, text: string, size: number, delay: number) => {
      const t = scene.add
        .text(GAME_WIDTH / 2, y, text, {
          fontFamily: UI_FONT_FAMILY,
          fontSize: `${size}px`,
          fontStyle: 'bold',
          color: UI_COLORS.title,
          stroke: UI_COLORS.titleStroke,
          strokeThickness: 6,
          align: 'center',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.overlay + 1)
        .setAlpha(0);
      scene.tweens.add({ targets: t, alpha: 1, y: y - 10, delay, duration: 700, ease: 'Sine.easeOut' });
      return t;
    };

    line(GAME_HEIGHT / 2 - 50, STRINGS.finishLine1, 46, FINISH.firstLineDelayMs);
    line(GAME_HEIGHT / 2 + 30, STRINGS.finishLine2, 34, FINISH.secondLineDelayMs);
    const prompt = line(GAME_HEIGHT - 90, STRINGS.finishPrompt, 22, FINISH.promptDelayMs);

    return new Promise((resolve) => {
      scene.time.delayedCall(FINISH.promptDelayMs + 700, () => {
        scene.tweens.add({ targets: prompt, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });
        resolve();
      });
    });
  }
}
