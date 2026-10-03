import Phaser from 'phaser';
import { RESPAWN } from '../config/constants';
import type { Mishkontin } from '../entities/Mishkontin';
import type { CheckpointSystem } from './CheckpointSystem';
import type { InputSystem } from './InputSystem';

export interface RespawnCallbacks {
  /** Called once when the fall is detected (e.g. a water splash). */
  onFall?: (x: number) => void;
  onRespawned: () => void;
}

/**
 * Falling out of the level (or into the river) is not a "death": a short
 * fade, then Mishkontin is back at the last checkpoint with all progress kept.
 */
export class RespawnController {
  private respawning = false;

  /** Respawn depth for a level: just under the river surface, or below the world. */
  static killYFor(level: { height: number; waterSurfaceY?: number }): number {
    return level.waterSurfaceY !== undefined
      ? level.waterSurfaceY + RESPAWN.waterDepthPx
      : level.height + RESPAWN.fallMarginPx;
  }

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Mishkontin,
    private readonly checkpoints: CheckpointSystem,
    private readonly controls: InputSystem,
    private readonly killY: number,
    private readonly callbacks: RespawnCallbacks,
  ) {}

  update(): void {
    if (!this.respawning && this.player.y > this.killY) this.respawn();
  }

  get isRespawning(): boolean {
    return this.respawning;
  }

  respawn(): void {
    if (this.respawning) return;
    this.respawning = true;
    this.controls.setEnabled(false);
    this.callbacks.onFall?.(this.player.x);
    const camera = this.scene.cameras.main;
    camera.fade(RESPAWN.fadeOutMs, 0, 0, 0, true);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const point = this.checkpoints.respawnPoint;
      this.player.respawnAt(point.x, point.y);
      this.callbacks.onRespawned();
      camera.fadeIn(RESPAWN.fadeInMs, 0, 0, 0);
      this.controls.setEnabled(true);
      this.respawning = false;
    });
  }
}
