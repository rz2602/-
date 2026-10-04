import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, UI_COLORS } from '../config/constants';
import type { Mishkontin } from '../entities/Mishkontin';
import type { VisualLayer } from '../levels/forest/forestLayers';
import type { AreaDef } from '../levels/LevelTypes';
import { getProductionAsset } from '../levels/forest/productionAssets';
import { auditAssetScale, MAX_ALLOWED_MAGNIFICATION, type AssetScaleRow } from './AssetScaleAudit';
import type { CheckpointSystem } from './CheckpointSystem';
import { RenderScale } from './RenderScale';

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
  private auditSummary = '';
  private readonly inspectText: Phaser.GameObjects.Text;
  private readonly inspectBox: Phaser.GameObjects.Graphics;
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
      .text(GAME_WIDTH - 12, 12, '', {
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
    this.inspectBox = scene.add.graphics().setDepth(DEPTH.debug);
    this.inspectText = scene.add
      .text(12, GAME_HEIGHT - 12, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: UI_COLORS.debug,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH.debug);
    scene.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => this.inspectAt(pointer));
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
    this.inspectText.setVisible(visible);
    this.inspectBox.setVisible(visible);
    this.markers.setVisible(visible);
    if (!visible && this.soloIndex !== -1) this.setSolo(-1);

    const world = this.scene.physics.world;
    if (visible && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = visible;
    if (!visible) world.debugGraphic?.clear();
    if (visible) {
      this.refreshAuditSummary();
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
      `render     x${RenderScale.value} (${RenderScale.canvasWidth}x${RenderScale.canvasHeight})`,
      `textures   ${this.auditSummary}`,
      `F3/\` hide  H hurt  L solo  R audit  click: inspect`,
    ]);
    this.layerText.setText(this.layerReport(p.x));
    this.drawMarkers();
  }

  /**
   * Resolution audit: logs every raster texture's on-screen magnification
   * (console table) and returns the rows. Assets above ~125% at 2560x1440
   * need higher-resolution source art.
   */
  runAssetAudit(): AssetScaleRow[] {
    const rows = auditAssetScale(this.scene, RenderScale.value);
    this.refreshAuditSummary(rows);
    console.table(rows.map((r) => ({
      key: r.key,
      native: `${r.nativeWidth}x${r.nativeHeight}`,
      'drawn at (logical)': r.logicalScale,
      'rendered @1440p': `${Math.round(r.nativeWidth * r.magnificationQhd)}x${Math.round(r.nativeHeight * r.magnificationQhd)}`,
      'magnified now': r.magnification,
      'magnified @1440p': r.magnificationQhd,
      status: r.ok ? 'OK' : 'REPLACE',
      'source for 1440p': r.sourceForQhd.join('x'),
      'source for 4K': r.sourceForUhd.join('x'),
    })));
    return rows;
  }

  private refreshAuditSummary(rows = auditAssetScale(this.scene, RenderScale.value)): void {
    const over = rows.filter((r) => r.magnification > MAX_ALLOWED_MAGNIFICATION).length;
    this.auditSummary = `${over}/${rows.length} over ${Math.round(MAX_ALLOWED_MAGNIFICATION * 100)}% now`;
  }

  /** Cycles: all layers -> layer 0 only -> ... -> last layer only -> all. */
  cycleLayerSolo(): void {
    if (!this.visible) return;
    const next = this.soloIndex + 1 >= this.visual.layers.length ? -1 : this.soloIndex + 1;
    this.setSolo(next);
    this.sinceRefreshMs = TEXT_REFRESH_MS;
  }

  /**
   * Art inspector: the top-most textured world object under the pointer
   * (respecting each object's parallax scroll factor) - texture, native and
   * rendered size, render scale %, anchor, world position, scroll factor and
   * physics body. Development only.
   */
  inspectAt(pointer: Phaser.Input.Pointer): string | null {
    if (!this.visible) return null;
    const cam = this.scene.cameras.main;
    const world = cam.getWorldPoint(pointer.x, pointer.y);
    const hits = this.scene.children.list
      .filter((o): o is Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.TileSprite =>
        (o instanceof Phaser.GameObjects.Image || o instanceof Phaser.GameObjects.Sprite || o instanceof Phaser.GameObjects.TileSprite) &&
        o.visible && o.depth < DEPTH.hud && !o.texture.key.startsWith('fx-') && !o.texture.key.startsWith('__'))
      .sort((a, b) => b.depth - a.depth);
    for (const o of hits) {
      // Screen position of an object with scroll factor s: world - scroll * s.
      const px = world.x - cam.scrollX * (1 - o.scrollFactorX);
      const py = world.y - cam.scrollY * (1 - o.scrollFactorY);
      if (!o.getBounds().contains(px, py)) continue;
      const tile = o instanceof Phaser.GameObjects.TileSprite;
      const frame = tile ? (o as unknown as { displayFrame: Phaser.Textures.Frame }).displayFrame : o.frame;
      const scale = tile ? o.tileScaleX : Math.abs(o.scaleX);
      const pct = (s: number) => `${Math.round(s * 100)}%`;
      const body = (o.body as Phaser.Physics.Arcade.Body | null) ?? null;
      const lines = [
        `texture   ${frame.texture.key}${frame.name !== '__BASE' ? ` [${frame.name}]` : ''}`,
        `native    ${frame.realWidth} x ${frame.realHeight}`,
        `rendered  ${Math.round(o.displayWidth)} x ${Math.round(o.displayHeight)} logical  (${Math.round(o.displayWidth * RenderScale.value)} x ${Math.round(o.displayHeight * RenderScale.value)} device)`,
        `scale     ${pct(scale)} logical / ${pct(scale * RenderScale.value)} now / ${pct(scale * 2)} @1440p`,
        `anchor    ${o.originX.toFixed(3)}, ${o.originY.toFixed(3)} (normalized origin)`,
        `world     ${Math.round(o.x)}, ${Math.round(o.y)}   depth ${o.depth}`,
        `scroll    ${o.scrollFactorX} / ${o.scrollFactorY}`,
        `physics   ${body ? `${Math.round(body.width)} x ${Math.round(body.height)} @ ${Math.round(body.x)}, ${Math.round(body.y)}` : 'none (decorative)'}`,
      ];
      const production = getProductionAsset(this.scene, frame.texture.key.replace(/#graded$/, ''));
      if (production) lines.push(`master    ${production.master} (${production.masterSize.join(' x ')})`, `alpha     ${production.alpha ?? (production.role === 'layer' ? 'layer' : 'A (real alpha)')}`);
      if (o === (this.player as unknown)) lines.push(`state     ${this.player.playerState} / ${this.player.anims.currentAnim?.key ?? '-'}`);
      this.inspectText.setText(lines);
      const b = o.getBounds();
      this.inspectBox.clear().lineStyle(2, 0xffd36b, 1)
        .strokeRect(b.x - cam.scrollX * (o.scrollFactorX - 1), b.y - cam.scrollY * (o.scrollFactorY - 1), b.width, b.height);
      return lines.join('\n');
    }
    this.inspectText.setText('nothing textured under the pointer');
    this.inspectBox.clear();
    return null;
  }

  destroy(): void {
    this.inspectText.destroy();
    this.inspectBox.destroy();
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
