import Phaser from 'phaser';
import { GameEvents } from '../config/constants';
import type { CheckpointDef, PointDef } from '../levels/LevelTypes';
import { SaveSystem } from './SaveSystem';

const TRIGGER_WIDTH = 80;
const TRIGGER_HEIGHT = 200;

/** Level-specific look of a checkpoint (e.g. the forest waystone). */
export interface CheckpointVisual {
  /** `animate` is false when restoring state silently (level start, loading a save). */
  setActive(active: boolean, animate: boolean): void;
}

export type CheckpointVisualFactory = (scene: Phaser.Scene, def: CheckpointDef) => CheckpointVisual;

interface Checkpoint {
  def: CheckpointDef;
  visual: CheckpointVisual;
  zone: Phaser.GameObjects.Zone;
}

/**
 * Level-agnostic checkpoints: creates the markers (via a visual factory),
 * activates them on touch, persists the last one via SaveSystem and answers
 * "where do I respawn?". Emits GameEvents.CheckpointActivated on the scene
 * (sound hook for later versions).
 */
export class CheckpointSystem {
  private readonly checkpoints: Checkpoint[] = [];
  private activeId: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly levelId: string,
    private readonly start: PointDef,
    defs: CheckpointDef[],
    createVisual: CheckpointVisualFactory,
    private readonly onActivated: (def: CheckpointDef) => void,
  ) {
    for (const def of defs) {
      const visual = createVisual(scene, def);
      const zone = scene.add.zone(def.x, def.y - TRIGGER_HEIGHT / 2, TRIGGER_WIDTH, TRIGGER_HEIGHT);
      scene.physics.add.existing(zone, true);
      this.checkpoints.push({ def, visual, zone });
    }

    // Resume from a saved checkpoint of this level, silently.
    const saved = SaveSystem.getCheckpoint(levelId);
    const savedCheckpoint = this.checkpoints.find((c) => c.def.id === saved);
    if (savedCheckpoint) this.markActive(savedCheckpoint, false);
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
    this.markActive(checkpoint, true);
    SaveSystem.setCheckpoint(this.levelId, checkpoint.def.id);
    this.scene.events.emit(GameEvents.CheckpointActivated, checkpoint.def);
    this.onActivated(checkpoint.def);
  }

  private markActive(checkpoint: Checkpoint, animate: boolean): void {
    for (const c of this.checkpoints) if (c !== checkpoint) c.visual.setActive(false, false);
    checkpoint.visual.setActive(true, animate);
    this.activeId = checkpoint.def.id;
  }
}
