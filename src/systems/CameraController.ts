import Phaser from 'phaser';
import { CAMERA } from '../config/constants';

interface FollowTarget extends Phaser.GameObjects.Components.Transform {
  readonly facingDirection: 1 | -1;
}

/**
 * Smooth side-scrolling follow with a modest dead-zone and a gently eased
 * look-ahead in the facing direction. No screen shake.
 */
export class CameraController {
  private lookAhead = 0;

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly target: FollowTarget & Phaser.GameObjects.GameObject,
    boundsWidth: number,
    boundsBottom: number,
  ) {
    camera.setBounds(0, 0, boundsWidth, boundsBottom);
    camera.startFollow(target, false, CAMERA.followLerpX, CAMERA.followLerpY);
    camera.setDeadzone(CAMERA.deadzoneWidth, CAMERA.deadzoneHeight);
    this.lookAhead = CAMERA.lookAheadX * target.facingDirection;
    this.applyOffset();
  }

  update(deltaMs: number): void {
    const goal = CAMERA.lookAheadX * this.target.facingDirection;
    // Frame-rate independent exponential ease towards the goal.
    const t = 1 - Math.exp(-CAMERA.lookAheadResponsiveness * (deltaMs / 1000));
    this.lookAhead += (goal - this.lookAhead) * t;
    this.applyOffset();
  }

  /** Jumps straight to the target (after respawn) instead of gliding across the level. */
  snapToTarget(): void {
    this.lookAhead = CAMERA.lookAheadX * this.target.facingDirection;
    this.applyOffset();
    const cam = this.camera;
    cam.centerOn(this.target.x - cam.followOffset.x, this.target.y - cam.followOffset.y);
  }

  /**
   * Finish moment: stop following and glide up a little so the distant view
   * (mountains, Sirengrad) opens up above Mishkontin.
   */
  showViewpoint(): void {
    const cam = this.camera;
    cam.stopFollow();
    cam.pan(cam.midPoint.x, cam.midPoint.y - CAMERA.viewpointRisePx, CAMERA.viewpointPanMs, 'Sine.easeInOut');
  }

  private applyOffset(): void {
    // Phaser subtracts the follow offset from the target position.
    this.camera.setFollowOffset(-this.lookAhead, CAMERA.followOffsetY);
  }
}
