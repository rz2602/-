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

/**
 * Adaptive quality: smooth motion first. If the device cannot keep up (frames
 * dropped), the render scale is lowered in small steps until it can; it never
 * goes back up by itself (no oscillation). Off in automated browsers (their
 * software renderer runs at a few fps and is not representative) and with
 * `?fullres`; `?adaptive=force` turns it on for testing.
 */
const ADAPTIVE = {
  /** Frames ignored after start / any scale change, before measuring. */
  warmupFrames: 90,
  /** Frames per measurement window. */
  windowFrames: 120,
  /** A frame counts as dropped when it takes this many display intervals or more. */
  droppedFactor: 1.6,
  /** Lower the scale when more than this share of frames was dropped. */
  maxDroppedShare: 0.08,
  /** Fastest frames slower than this (≈48 fps) = steadily too slow. */
  slowFrameMs: 21,
  /** Each step lowers the scale to this fraction. */
  stepFactor: 0.85,
  /** Never below this (1 = the logical 1280x720). */
  minScale: 1,
} as const;

let qualityCap = MAX_RENDER_SCALE;

function computeScale(): number {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  const scale = Phaser.Math.Clamp(fit * dpr, MIN_RENDER_SCALE, Math.min(MAX_RENDER_SCALE, qualityCap));
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

    const applyScale = (next: number) => {
      if (Math.abs(next - current) / current < CHANGE_THRESHOLD) return;
      current = next;
      game.scale.setGameSize(this.canvasWidth, this.canvasHeight);
      for (const scene of game.scene.getScenes(true)) {
        for (const camera of scene.cameras.cameras) this.applyToCamera(camera);
      }
      governor.reset();
    };

    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => applyScale(computeScale()), RESIZE_DEBOUNCE_MS);
    };

    const params = new URLSearchParams(window.location.search);
    const adaptiveOn = params.get('adaptive') === 'force' || (!navigator.webdriver && !params.has('fullres'));
    const governor = new FrameGovernor((share) => {
      if (current <= ADAPTIVE.minScale) return;
      qualityCap = Math.max(ADAPTIVE.minScale, Math.round(current * ADAPTIVE.stepFactor * 100) / 100);
      console.info(`[RenderScale] ${Math.round(share * 100)}% frames dropped - render scale ${current} -> ${qualityCap}`);
      applyScale(computeScale());
    });
    if (adaptiveOn) {
      game.events.on(Phaser.Core.Events.POST_STEP, () => governor.sample(game.loop.rawDelta));
      game.events.on(Phaser.Core.Events.HIDDEN, () => governor.reset());
    }
    window.addEventListener('resize', onResize);
    // Moving the window to a monitor with a different pixel ratio.
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', onResize);
  },
};

/** Watches real frame times and reports when too many frames are dropped. */
class FrameGovernor {
  private samples: number[] = [];
  private skip: number = ADAPTIVE.warmupFrames;

  constructor(private readonly onTooSlow: (droppedShare: number) => void) {}

  reset(): void {
    this.samples = [];
    this.skip = ADAPTIVE.warmupFrames;
  }

  sample(deltaMs: number): void {
    if (this.skip > 0) {
      this.skip--;
      return;
    }
    // Ignore pauses (tab switch, debugger): not a rendering problem.
    if (!(deltaMs > 0) || deltaMs > 250) return;
    this.samples.push(deltaMs);
    if (this.samples.length < ADAPTIVE.windowFrames) return;
    const sorted = [...this.samples].sort((a, b) => a - b);
    // The display interval is what the fastest frames achieve (8.3 ms at 120 Hz, 16.7 ms at 60 Hz).
    const interval = sorted[Math.floor(sorted.length * 0.1)];
    // Even the fastest frames under ~48 fps: the device is uniformly too slow, not just hitching.
    const dropped =
      interval > ADAPTIVE.slowFrameMs
        ? 1
        : this.samples.filter((d) => d >= interval * ADAPTIVE.droppedFactor).length / this.samples.length;
    this.samples = [];
    if (dropped > ADAPTIVE.maxDroppedShare) {
      this.onTooSlow(dropped);
      this.skip = ADAPTIVE.warmupFrames;
    }
  }
}

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
