import Phaser from 'phaser';
import { DEPTH, UI_COLORS } from '../config/constants';
import type { Mishkontin } from '../entities/Mishkontin';
import type { CheckpointSystem } from './CheckpointSystem';

const TEXT_REFRESH_MS = 100;
const MARKER_SIZE = 14;

/**
 * Developer overlay: FPS, position, velocity, grounded flag, state/animation,
 * Arcade physics bodies and checkpoint markers. Hidden unless enabled.
 */
export class DebugOverlay {
  private visible = false;
  private readonly text: Phaser.GameObjects.Text;
  private readonly markers: Phaser.GameObjects.Graphics;
  private sinceRefreshMs = TEXT_REFRESH_MS;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Mishkontin,
    private readonly checkpoints: CheckpointSystem,
    initiallyVisible: boolean,
  ) {
    this.text = scene.add
      .text(12, 12, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: UI_COLORS.debug,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.debug);
    this.markers = scene.add.graphics().setDepth(DEPTH.debug);
    this.setVisible(initiallyVisible);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  toggle(): boolean {
    this.setVisible(!this.visible);
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.text.setVisible(visible);
    this.markers.setVisible(visible);

    const world = this.scene.physics.world;
    if (visible && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = visible;
    if (!visible) world.debugGraphic?.clear();
    if (visible) {
      this.drawMarkers();
      this.sinceRefreshMs = TEXT_REFRESH_MS;
    }
  }

  update(deltaMs: number): void {
    if (!this.visible) return;
    this.sinceRefreshMs += deltaMs;
    if (this.sinceRefreshMs < TEXT_REFRESH_MS) return;
    this.sinceRefreshMs = 0;

    const p = this.player;
    const v = p.body.velocity;
    const respawn = this.checkpoints.respawnPoint;
    this.text.setText([
      `FPS        ${this.scene.game.loop.actualFps.toFixed(0)}`,
      `pos        ${p.x.toFixed(0)}, ${p.y.toFixed(0)}`,
      `vel        ${v.x.toFixed(0)}, ${v.y.toFixed(0)}`,
      `grounded   ${p.isGrounded}`,
      `state      ${p.playerState}`,
      `anim       ${p.anims.currentAnim?.key ?? '-'}`,
      `facing     ${p.facingDirection > 0 ? 'right' : 'left'}`,
      `coyote     ${p.coyoteRemainingMs().toFixed(0)} ms`,
      `checkpoint ${this.checkpoints.activeCheckpointId ?? 'start'} @ ${respawn.x}, ${respawn.y}`,
      `F3/\` hide   H test hurt`,
    ]);
    this.drawMarkers();
  }

  destroy(): void {
    this.text.destroy();
    this.markers.destroy();
  }

  private drawMarkers(): void {
    const g = this.markers;
    const active = this.checkpoints.respawnPoint;
    g.clear();
    for (const cp of this.checkpoints.all) {
      g.lineStyle(2, 0xffd36b, 1);
      g.strokeRect(cp.x - MARKER_SIZE / 2, cp.y - MARKER_SIZE, MARKER_SIZE, MARKER_SIZE);
    }
    g.lineStyle(3, 0x55ff88, 1);
    g.lineBetween(active.x - MARKER_SIZE, active.y, active.x + MARKER_SIZE, active.y);
    g.lineBetween(active.x, active.y - MARKER_SIZE * 2, active.x, active.y);
  }
}
