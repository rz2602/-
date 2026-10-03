import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

/**
 * High-resolution rendering.
 *
 * Game logic, layout and physics use a fixed LOGICAL resolution of
 * GAME_WIDTH x GAME_HEIGHT (1280x720). The canvas backbuffer, however, is
 * sized to the real number of device pixels it is displayed on (CSS size x
 * devicePixelRatio) and every camera is zoomed by the same factor - so the
 * browser never stretches a small canvas across a large monitor:
 *
 *   1280x720 window  -> scale 1    (1280x720 canvas)
 *   1920x1080        -> scale 1.5  (1920x1080 canvas)
 *   2560x1440        -> scale 2    (2560x1440 canvas)
 *   4K / HiDPI       -> up to MAX_RENDER_SCALE
 *
 * Cameras use origin (0, 0) so screen-fixed objects (scroll factor 0) keep
 * their logical positions: screen = (world - scroll) * scale.
 */
const MAX_RENDER_SCALE = 3;
const MIN_RENDER_SCALE = 1;
/** Ignore tiny changes (scrollbars, zoom jitter) to avoid re-creating the backbuffer. */
const CHANGE_THRESHOLD = 0.05;
const RESIZE_DEBOUNCE_MS = 250;

function computeScale(): number {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  const scale = Phaser.Math.Clamp(fit * dpr, MIN_RENDER_SCALE, MAX_RENDER_SCALE);
  return Math.round(scale * 100) / 100;
}

let current = computeScale();

export const RenderScale = {
  /** Device pixels per logical pixel. */
  get value(): number {
    return current;
  },

  /** Backbuffer size for the current scale. */
  get canvasWidth(): number {
    return Math.round(GAME_WIDTH * current);
  },
  get canvasHeight(): number {
    return Math.round(GAME_HEIGHT * current);
  },

  /** Zooms a camera so it shows the logical 1280x720 view at full device resolution. */
  applyToCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
    camera.setOrigin(0, 0);
    camera.setZoom(current);
  },

  /**
   * Hooks every scene (camera zoom on create), renders Text at device
   * resolution, and follows window resizes / monitor changes.
   */
  install(game: Phaser.Game): void {
    patchTextResolution();
    game.events.once(Phaser.Core.Events.READY, () => {
      for (const scene of game.scene.scenes) {
        scene.sys.events.on(Phaser.Scenes.Events.CREATE, () => this.applyToCamera(scene.cameras.main));
        if (scene.cameras?.main) this.applyToCamera(scene.cameras.main);
      }
    });

    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const next = computeScale();
        if (Math.abs(next - current) / current < CHANGE_THRESHOLD) return;
        current = next;
        game.scale.setGameSize(this.canvasWidth, this.canvasHeight);
        for (const scene of game.scene.getScenes(true)) {
          for (const camera of scene.cameras.cameras) this.applyToCamera(camera);
        }
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);
    // Moving the window to a monitor with a different pixel ratio.
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', onResize);
  },
};

/** Text objects rasterise their own canvas; give them device resolution so UI text stays crisp. */
function patchTextResolution(): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
    text: (...args: unknown[]) => Phaser.GameObjects.Text;
  };
  const original = factory.text;
  factory.text = function patchedText(this: unknown, ...args: unknown[]) {
    return original.apply(this, args).setResolution(current);
  };
}
