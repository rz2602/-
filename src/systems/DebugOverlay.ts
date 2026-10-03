import Phaser from 'phaser';
import { DEPTH, UI_COLORS } from '../config/constants';
import type { Mishkontin } from '../entities/Mishkontin';
import type { VisualLayer } from '../levels/forest/forestLayers';
import type { AreaDef } from '../levels/LevelTypes';
import type { CheckpointSystem } from './CheckpointSystem';

export interface DebugVisualInfo {
  /** Visual layers back to front (listed, and soloable with L). */
  layers: readonly VisualLayer[];
  areas: readonly AreaDef[];
}

const TEXT_REFRESH_MS = 100;
const MARKER_SIZE = 14;

/**
 * Developer overlay: FPS, position, velocity, grounded flag, state/animation,
 * Arcade physics bodies, checkpoint markers, visual layers (with scroll
 * factors) and the current composition area. Hidden unless enabled.
 * While visible, L cycles "layer solo" (show one visual layer at a time).
 */
export class DebugOverlay {
  private visible = false;
  private readonly text: Phaser.GameObjects.Text;
  private readonly layerText: Phaser.GameObjects.Text;
  /** -1 = all layers shown; otherwise index into visual.layers. */
  private soloIndex = -1;
  private readonly savedVisibility = new Map<Phaser.GameObjects.GameObject, boolean>();
  private readonly markers: Phaser.GameObjects.Graphics;
  private sinceRefreshMs = TEXT_REFRESH_MS;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Mishkontin,
    private readonly checkpoints: CheckpointSystem,
    initiallyVisible: boolean,
    private readonly visual: DebugVisualInfo,
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
    this.layerText = scene.add
      .text(scene.scale.gameSize.width - 12, 12, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: UI_COLORS.debug,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
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
    this.layerText.setVisible(visible);
    this.markers.setVisible(visible);
    if (!visible && this.soloIndex !== -1) this.setSolo(-1);

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
      `F3/\` hide   H test hurt   L solo layer`,
    ]);
    this.layerText.setText(this.layerReport(p.x));
    this.drawMarkers();
  }

  /** Cycles: all layers -> layer 0 only -> ... -> last layer only -> all. */
  cycleLayerSolo(): void {
    if (!this.visible) return;
    const next = this.soloIndex + 1 >= this.visual.layers.length ? -1 : this.soloIndex + 1;
    this.setSolo(next);
    this.sinceRefreshMs = TEXT_REFRESH_MS;
  }

  destroy(): void {
    this.layerText.destroy();
    this.text.destroy();
    this.markers.destroy();
  }

  private layerReport(playerX: number): string[] {
    const area = this.visual.areas.find((a) => playerX >= a.x0 && playerX < a.x1);
    const lines = [`area  ${area ? `${area.id} ${area.name}` : '-'}`, '', 'LAYER                   SCROLL X / Y'];
    this.visual.layers.forEach((layer, i) => {
      const mark = this.soloIndex === i ? '>' : ' ';
      lines.push(`${mark}${layer.label.padEnd(24)} ${layer.scrollX.toFixed(2)} / ${layer.scrollY.toFixed(2)}`);
    });
    lines.push('', this.soloIndex === -1 ? 'solo: off' : `solo: ${this.visual.layers[this.soloIndex].label}`);
    return lines;
  }

  /** Shows only game objects whose depth falls in the chosen layer's range (debug/UI untouched). */
  private setSolo(index: number): void {
    const layers = this.visual.layers;
    if (this.soloIndex === -1 && index !== -1) {
      this.savedVisibility.clear();
      for (const child of this.scene.children.list) {
        const v = child as unknown as Phaser.GameObjects.Components.Visible;
        if (typeof v.visible === 'boolean') this.savedVisibility.set(child, v.visible);
      }
    }
    this.soloIndex = index;
    const min = index <= 0 ? -Infinity : layers[index].depth;
    const max = index === -1 ? 0 : (layers[index + 1]?.depth ?? DEPTH.hud);
    for (const [child, wasVisible] of this.savedVisibility) {
      const obj = child as unknown as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.Components.Depth;
      if (!child.scene || obj.depth >= DEPTH.hud) continue;
      obj.setVisible(index === -1 ? wasVisible : wasVisible && obj.depth >= min && obj.depth < max);
    }
    if (index === -1) this.savedVisibility.clear();
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
