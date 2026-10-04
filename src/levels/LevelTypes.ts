/** Data-only level description, so new levels need no new code. */

/** Solid ground: filled from `top` down past the bottom of the world. */
export interface TerrainDef {
  x: number;
  width: number;
  top: number;
}

/** How a one-way platform looks. Physics is always a simple flat surface. */
export type PlatformStyle = 'grass' | 'bridge';

/** Floating one-way platform: can be jumped through from below. */
export interface PlatformDef {
  x: number;
  /** Top surface y. */
  y: number;
  width: number;
  style?: PlatformStyle;
}

export interface PointDef {
  x: number;
  /** Ground (feet) y. */
  y: number;
}

export interface CheckpointDef extends PointDef {
  id: string;
}

/**
 * Which visual layer a decoration lives on:
 *   back       - behind the terrain, slower parallax (big trees, waterfalls)
 *   ground     - on the gameplay surface, behind Mishkontin (no collision)
 *   foreground - in front of everything, faster parallax; screen-edge only
 */
export type DecorationLayer = 'back' | 'ground' | 'foreground';

export interface DecorationDef extends PointDef {
  /** Forest texture key (see forest-assets.json). */
  key: string;
  layer?: DecorationLayer;
  /** Legacy kit art: display scale. */
  scale?: number;
  /** Production art: world height in logical px (resolution-independent). */
  height?: number;
  flipX?: boolean;
}

/** Named composition area (documentation + debug overlay). */
export interface AreaDef {
  id: string;
  name: string;
  x0: number;
  x1: number;
}

/** Soft light shaft falling onto a spot (world space). */
export interface LightDef extends PointDef {
  width: number;
  height: number;
}

export interface LevelDef {
  id: string;
  width: number;
  /** Physics world height; falling below it (plus a margin) respawns the player. */
  height: number;
  /** Lowest y the camera shows. Keeps the screen from filling up with soil. */
  cameraBottom: number;
  /** River surface visible in every gap; touching it respawns (no swimming yet). */
  waterSurfaceY?: number;
  spawn: PointDef;
  terrain: TerrainDef[];
  platforms: PlatformDef[];
  checkpoints: CheckpointDef[];
  finish: PointDef;
  decorations: DecorationDef[];
  /** Static waterfall artwork on the back layer; `y` = ground contact of its pool. */
  waterfalls: Array<PointDef & { height: number }>;
  lights: LightDef[];
  areas: AreaDef[];
  /** Terrain segments (indices) that get small scattered plants. */
  scatterOn: number[];
}
