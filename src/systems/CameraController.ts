import Phaser from 'phaser';
import { CAMERA, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

interface FollowTarget extends Phaser.GameObjects.Components.Transform {
  readonly facingDirection: 1 | -1;
  /** Drawn position (render interpolation), when it differs from the physics position. */
  readonly viewX?: number;
  readonly viewY?: number;
}

const FRAME_MS = 1000 / 60;

/**
 * Smooth side-scrolling follow with a modest dead-zone and a gently eased
 * look-ahead in the facing direction. No screen shake.
 *
 * Follow is computed here (not with Phaser's startFollow) because cameras are
 * zoomed for high-resolution rendering with origin (0, 0) - see RenderScale.
 * All values are in LOGICAL pixels; scroll = view centre - half the logical view.
 */
export class CameraController {
  private lookAhead = 0;
  private centerX = 0;
  private centerY = 0;
  private following = true;

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly target: FollowTarget & Phaser.GameObjects.GameObject,
    private readonly boundsWidth: number,
    private readonly boundsBottom: number,
  ) {
    this.snapToTarget();
  }

  update(deltaMs: number): void {
    if (!this.following) {
      this.apply();
      return;
    }
    const goal = CAMERA.lookAheadX * this.target.facingDirection;
    // Frame-rate independent exponential ease towards the goal.
    const t = 1 - Math.exp(-CAMERA.lookAheadResponsiveness * (deltaMs / 1000));
    this.lookAhead += (goal - this.lookAhead) * t;

    const [tx, ty] = this.focusPoint();
    // Dead-zone: only the part of the offset outside the zone moves the camera.
    const dx = excess(tx - this.centerX, CAMERA.deadzoneWidth / 2);
    const dy = excess(ty - this.centerY, CAMERA.deadzoneHeight / 2);
    const frames = deltaMs / FRAME_MS;
    this.centerX += dx * (1 - Math.pow(1 - CAMERA.followLerpX, frames));
    this.centerY += dy * (1 - Math.pow(1 - CAMERA.followLerpY, frames));
    this.apply();
  }

  /** Jumps straight to the target (after respawn) instead of gliding across the level. */
  snapToTarget(): void {
    this.lookAhead = CAMERA.lookAheadX * this.target.facingDirection;
    [this.centerX, this.centerY] = this.focusPoint();
    this.apply();
  }

  /**
   * Finish moment: stop following and glide up a little so the distant view
   * (mountains, Sirengrad) opens up above Mishkontin.
   */
  showViewpoint(): void {
    this.following = false;
    this.target.scene.tweens.add({
      targets: this,
      centerY: this.clampY(this.centerY) - CAMERA.viewpointRisePx,
      duration: CAMERA.viewpointPanMs,
      ease: 'Sine.easeInOut',
    });
  }

  /** Point the view centre is pulled towards (player + look-ahead, slightly above). */
  private focusPoint(): [number, number] {
    return [(this.target.viewX ?? this.target.x) + this.lookAhead, (this.target.viewY ?? this.target.y) - CAMERA.followOffsetY];
  }

  private apply(): void {
    this.centerX = this.clampX(this.centerX);
    if (this.following) this.centerY = this.clampY(this.centerY);
    this.camera.setScroll(this.centerX - GAME_WIDTH / 2, this.centerY - GAME_HEIGHT / 2);
  }

  private clampX(x: number): number {
    return Phaser.Math.Clamp(x, GAME_WIDTH / 2, Math.max(GAME_WIDTH / 2, this.boundsWidth - GAME_WIDTH / 2));
  }

  private clampY(y: number): number {
    return Phaser.Math.Clamp(y, GAME_HEIGHT / 2, Math.max(GAME_HEIGHT / 2, this.boundsBottom - GAME_HEIGHT / 2));
  }
}

/** Signed distance by which `offset` exceeds +/-`half` (0 inside the zone). */
function excess(offset: number, half: number): number {
  if (offset > half) return offset - half;
  if (offset < -half) return offset + half;
  return 0;
}
