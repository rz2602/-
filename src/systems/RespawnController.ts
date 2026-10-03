import Phaser from 'phaser';
import { RESPAWN } from '../config/constants';
import type { Mishkontin } from '../entities/Mishkontin';
import type { CheckpointSystem } from './CheckpointSystem';
import type { InputSystem } from './InputSystem';

/**
 * Falling out of the level is not a "death": a short fade, then Mishkontin is
 * back at the last checkpoint with all progress kept.
 */
export class RespawnController {
  private respawning = false;
  private readonly killY: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Mishkontin,
    private readonly checkpoints: CheckpointSystem,
    private readonly controls: InputSystem,
    worldHeight: number,
    private readonly onRespawned: () => void,
  ) {
    this.killY = worldHeight + RESPAWN.fallMarginPx;
  }

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
    const camera = this.scene.cameras.main;
    camera.fade(RESPAWN.fadeOutMs, 0, 0, 0, true);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const point = this.checkpoints.respawnPoint;
      this.player.respawnAt(point.x, point.y);
      this.onRespawned();
      camera.fadeIn(RESPAWN.fadeInMs, 0, 0, 0);
      this.controls.setEnabled(true);
      this.respawning = false;
    });
  }
}
