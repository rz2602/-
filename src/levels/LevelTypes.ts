/** Data-only level description, so new levels need no new code. */

/** Solid ground: filled from `top` down past the bottom of the world. */
export interface TerrainDef {
  x: number;
  width: number;
  top: number;
}

/** Floating one-way platform: can be jumped through from below. */
export interface PlatformDef {
  x: number;
  /** Top surface y. */
  y: number;
  width: number;
}

export interface PointDef {
  x: number;
  /** Ground (feet) y. */
  y: number;
}

export interface CheckpointDef extends PointDef {
  id: string;
}

export type DecorationKind = 'tree' | 'bush' | 'mushroom' | 'signArrow' | 'signCaution';

export interface DecorationDef extends PointDef {
  kind: DecorationKind;
  scale?: number;
  flipX?: boolean;
}

export interface LevelDef {
  id: string;
  width: number;
  /** Physics world height; falling below it (plus a margin) respawns the player. */
  height: number;
  /** Lowest y the camera shows. Keeps the screen from filling up with soil. */
  cameraBottom: number;
  spawn: PointDef;
  terrain: TerrainDef[];
  platforms: PlatformDef[];
  checkpoints: CheckpointDef[];
  finish: PointDef;
  decorations: DecorationDef[];
  /** Ground segments that get randomly scattered bushes/trees (by index into `terrain`). */
  scatterOn: number[];
}
