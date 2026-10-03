import Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import type { CheckpointDef, PointDef } from '../levels/LevelTypes';
import { PlaceholderTextures } from '../utils/placeholderArt';
import { SaveSystem } from './SaveSystem';

const TRIGGER_WIDTH = 80;
const TRIGGER_HEIGHT = 200;

interface Checkpoint {
  def: CheckpointDef;
  sprite: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Zone;
}

/**
 * Level-agnostic checkpoints: creates the markers, activates them on touch,
 * persists the last one via SaveSystem and answers "where do I respawn?".
 */
export class CheckpointSystem {
  private readonly checkpoints: Checkpoint[] = [];
  private activeId: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly levelId: string,
    private readonly start: PointDef,
    defs: CheckpointDef[],
    private readonly onActivated: (def: CheckpointDef) => void,
  ) {
    for (const def of defs) {
      const sprite = scene.add
        .image(def.x, def.y + 2, PlaceholderTextures.checkpointOff)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.props);
      const zone = scene.add.zone(def.x, def.y - TRIGGER_HEIGHT / 2, TRIGGER_WIDTH, TRIGGER_HEIGHT);
      scene.physics.add.existing(zone, true);
      this.checkpoints.push({ def, sprite, zone });
    }

    // Resume from a saved checkpoint of this level, silently.
    const saved = SaveSystem.getCheckpoint(levelId);
    const savedCheckpoint = this.checkpoints.find((c) => c.def.id === saved);
    if (savedCheckpoint) this.markActive(savedCheckpoint);
  }

  /** Registers overlap triggers for the player. */
  watch(player: Phaser.Types.Physics.Arcade.GameObjectWithBody): void {
    for (const checkpoint of this.checkpoints) {
      this.scene.physics.add.overlap(player, checkpoint.zone, () => this.activate(checkpoint));
    }
  }

  get respawnPoint(): PointDef {
    return this.checkpoints.find((c) => c.def.id === this.activeId)?.def ?? this.start;
  }

  get activeCheckpointId(): string | null {
    return this.activeId;
  }

  get all(): readonly CheckpointDef[] {
    return this.checkpoints.map((c) => c.def);
  }

  /** Forgets progress in this level (e.g. after finishing it). */
  clearProgress(): void {
    SaveSystem.setCheckpoint(this.levelId, null);
  }

  private activate(checkpoint: Checkpoint): void {
    if (this.activeId === checkpoint.def.id) return;
    this.markActive(checkpoint);
    SaveSystem.setCheckpoint(this.levelId, checkpoint.def.id);
    this.scene.tweens.add({ targets: checkpoint.sprite, scaleY: 1.12, duration: 120, yoyo: true, ease: 'Sine.easeOut' });
    this.onActivated(checkpoint.def);
  }

  private markActive(checkpoint: Checkpoint): void {
    for (const c of this.checkpoints) c.sprite.setTexture(PlaceholderTextures.checkpointOff);
    checkpoint.sprite.setTexture(PlaceholderTextures.checkpointOn);
    this.activeId = checkpoint.def.id;
  }
}
