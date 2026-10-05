/**
 * Central tuning values. Everything gameplay-relevant that might need tuning
 * lives here so it is never scattered as magic numbers through the code.
 */

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_VERSION = '0.1.1';

export const SceneKeys = {
  Boot: 'BootScene',
  Preload: 'PreloadScene',
  MainMenu: 'MainMenuScene',
  Settings: 'SettingsScene',
  ForestTest: 'ForestTestScene',
  Pause: 'PauseScene',
  /** Developer-only animation gallery (`?animlab`). */
  AnimationLab: 'AnimationLabScene',
} as const;

export const AssetKeys = {
  mishkontinManifest: 'mishkontin-frames-manifest',
  mishkontin: 'mishkontin',
  mishkontinV2: 'mishkontin-v2',
  mishkontinV2Manifest: 'mishkontin-v2-manifest',
  forestManifest: 'forest-assets-manifest',
  productionManifest: 'production-assets-manifest',
  /** Official brand assets: screen-space UI only. */
  brandWordmark: 'brand-wordmark',
  brandEmblem: 'brand-emblem',
} as const;

export const AssetPaths = {
  mishkontinManifest: 'assets/characters/mishkontin/generated/mishkontin-frames.json',
  mishkontinFrames: 'assets/characters/mishkontin/generated/mishkontin-frames.png',
  mishkontinV2Atlas: 'assets/characters/mishkontin/v2/mishkontin-v2.json',
  mishkontinV2Image: 'assets/characters/mishkontin/v2/mishkontin-v2.webp',
  mishkontinV2Manifest: 'assets/characters/mishkontin/v2/mishkontin-v2-manifest.json',
  forestManifest: 'assets/environments/forest/forest-assets.json',
  productionManifest: 'assets/production-assets.json',
  brandWordmark: 'assets/ui/branding/mishkontin-wordmark.png',
  brandEmblem: 'assets/ui/branding/mishkontin-emblem.png',
} as const;

/** Scene events other systems (e.g. future audio) can listen to. */
export const GameEvents = {
  /** Payload: CheckpointDef. Sound hook - nothing plays yet. */
  CheckpointActivated: 'checkpoint-activated',
  /** Payload: x position. Sound hook - nothing plays yet. */
  WaterSplash: 'water-splash',
} as const;

/** World gravity (px/s^2). Applied by Arcade Physics to every dynamic body. */
export const GRAVITY_Y = 1100;

export const PLAYER_MOVEMENT = {
  maxSpeedX: 230,
  acceleration: 1200,
  /** Extra acceleration multiplier when pushing against current velocity (snappier turns). */
  turnAccelerationMultiplier: 1.8,
  /** Ground drag when no direction is held. */
  dragX: 1500,
  /** Air drag is lower so jumps keep their momentum. */
  airDragX: 500,
  jumpVelocity: -480,
  /** Releasing jump early multiplies upward velocity by this (variable jump height). */
  jumpCutMultiplier: 0.5,
  maxFallSpeed: 900,
} as const;

/** Child-friendly forgiveness windows (ms). */
export const PLAYER_ASSISTS = {
  coyoteTimeMs: 100,
  jumpBufferMs: 120,
} as const;

/**
 * Gameplay character art: true = high-resolution V2 animation set
 * (tools/build-mishkontin-v2.mjs), false = legacy atlas. The legacy atlas stays
 * loaded either way (the locked Main Menu uses it), so switching back is safe.
 * Physics, body and movement are identical in both.
 */
export const USE_MISHKONTIN_V2 = true;

/**
 * Rendering scale of the LEGACY Mishkontin atlas (V2 uses its manifest's
 * runtimePxPerLogical). The collision body below is defined against it and
 * converted for V2, so the body is the same in logical px either way.
 */
export const PLAYER_SCALE = 0.85;

/**
 * Collision body in UNSCALED LEGACY atlas-frame pixels (Phaser scales it with
 * the sprite; V2 converts it to its own frame pixels). The body covers torso + legs only: ears, cloak, staff and tail are
 * visual only. It is centred on the foot anchor and its bottom edge sits
 * exactly on the feet. Tune these freely.
 */
export const PLAYER_BODY = {
  width: 46,
  standingHeight: 86,
  crouchHeight: 60,
  /** Horizontal nudge of the body relative to the foot anchor (+ = towards facing side). */
  offsetXFromAnchor: 2,
} as const;

export const PLAYER_ANIMATION = {
  /** Upward speed below which the jump is considered to be turning into a fall. */
  fallVelocityThreshold: 60,
  /** Minimum downward speed at touchdown to play the LAND animation. */
  landMinImpactVelocity: 320,
  /** LAND can be interrupted by horizontal input after this long. */
  landInterruptAfterMs: 90,
  hurtDurationMs: 900,
  hurtKnockbackX: 160,
  hurtKnockbackY: -260,
} as const;

/** Idle personality timings (ms). */
export const IDLE_BEHAVIOUR = {
  /** Plain idle loop only, before any alternate idle is allowed. */
  alternateIdleAfterMs: 5000,
  /** Random pause between alternate idles once allowed. */
  alternateIdleMinGapMs: 3000,
  alternateIdleMaxGapMs: 7000,
} as const;

export const CAMERA = {
  followLerpX: 0.09,
  followLerpY: 0.08,
  deadzoneWidth: 140,
  deadzoneHeight: 110,
  lookAheadX: 110,
  /** Fraction of the remaining look-ahead distance covered per second. */
  lookAheadResponsiveness: 2.2,
  /** Player screen position bias: slightly below centre so more of the sky/platforms above are visible. */
  followOffsetY: 60,
  /** Finish: how far the camera rises to reveal the distant view, and how slowly. */
  viewpointRisePx: 150,
  viewpointPanMs: 2600,
} as const;

export const RESPAWN = {
  /** How far below the world bottom the player must fall before respawning. */
  fallMarginPx: 120,
  /** How far below the river surface Mishkontin sinks before the respawn starts. */
  waterDepthPx: 26,
  fadeOutMs: 260,
  fadeInMs: 320,
  messageDurationMs: 1600,
} as const;

/**
 * River visuals below the level (v0.1.1 polish). The legacy river band was a
 * screen-wide rectangle that showed hard image edges at the bottom of every
 * gap, so it is hidden: the ravine walls continue below the screen instead.
 * VISUAL ONLY - the water kill line (RespawnController), splash event and
 * respawn are unchanged. Set true to bring the old river band back.
 */
export const RIVER_VISIBLE = false;

/**
 * Background readability: per-layer colour grading (no blur, no resampling).
 * saturation / contrast: 0 = unchanged, -0.1 = 10 % less; brightness: 1 =
 * unchanged multiplier. A graded copy of each layer texture is made once at
 * load (same size, per-pixel colour only). Gameplay layers and Mishkontin are
 * never graded. Gameplay only - the approved menu keeps its look.
 */
export const BACKGROUND_GRADING = {
  enabled: true,
  sky: { saturation: 0, contrast: 0, brightness: 1 },
  mountains: { saturation: -0.1, contrast: -0.08, brightness: 1.02 },
  distantForest: { saturation: -0.16, contrast: -0.12, brightness: 1.03 },
  midForest: { saturation: -0.05, contrast: -0.04, brightness: 1 },
} as const;

/** Additive sun-shaft overlay strength (0-1). */
export const SUN_SHAFTS = {
  /** Gameplay: ~40 % of the menu strength so shafts no longer wash over the play area. */
  gameplayAlpha: 0.22,
  /** Main Menu (approved look). */
  menuAlpha: 0.55,
} as const;

/** Boot / loading presentation with the official emblem. */
export const BOOT = {
  background: '#0b140e',
  emblemSize: 300,
  fadeInMs: 450,
  fadeOutMs: 380,
  /** Shortest time the emblem is shown, including loading (ms). */
  minimumShowMs: 1300,
  /** The progress line only appears if loading is still running after this long. */
  showProgressAfterMs: 600,
  barWidth: 220,
  barTrack: 0x2a3a2c,
  barFill: 0xd9a948,
} as const;

/** Main Menu layout around the official wordmark (logical px). */
export const MENU_LAYOUT = {
  wordmarkTop: 34,
  wordmarkMaxWidth: 680,
  wordmarkMaxHeight: 220,
  subtitleGap: 18,
  buttonsTop: 382,
  mishkontinX: 240,
} as const;

export const FINISH = {
  dimAlpha: 0.45,
  dimDurationMs: 900,
  firstLineDelayMs: 500,
  secondLineDelayMs: 1900,
  promptDelayMs: 3000,
} as const;

export const DEPTH = {
  skyBackground: -100,
  farBackground: -90,
  midBackground: -80,
  /** Decorative trees stand behind the ground and platforms so they never hide a ledge. */
  backgroundProps: -10,
  terrain: 0,
  props: 5,
  player: 10,
  foreground: 20,
  hud: 100,
  overlay: 200,
  debug: 300,
} as const;

export const UI_FONT_FAMILY = '"Trebuchet MS", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

export const UI_COLORS = {
  title: '#fff4d6',
  titleStroke: '#3b2a16',
  button: '#f6e7c1',
  buttonHover: '#ffd36b',
  buttonStroke: '#3b2a16',
  toast: '#fff8e3',
  debug: '#b8ffb0',
} as const;

export const STRINGS = {
  // The title itself is the official wordmark image (src/ui/Brand.ts) - never typed text.
  subtitle: 'И КРАЛЯТ ПЛЪХ МОРТИС',
  play: 'ИГРАЙ',
  settings: 'НАСТРОЙКИ',
  back: 'НАЗАД',
  resume: 'ПРОДЪЛЖИ',
  mainMenu: 'ГЛАВНО МЕНЮ',
  paused: 'ПАУЗА',
  retry: 'Хайде още веднъж!',
  checkpoint: 'Чекпойнт!',
  finishLine1: 'Приключението тепърва започва...',
  finishLine2: `Мишконтин — v${GAME_VERSION}`,
  finishPrompt: 'ENTER или щракни — към главното меню',
  settingsTitle: 'НАСТРОЙКИ',
  debugSetting: 'Информация за разработчици',
  fullscreenSetting: 'Цял екран',
  resetProgress: 'Изтрий запазения прогрес',
  progressReset: 'Прогресът е изтрит.',
  on: 'ВКЛ',
  off: 'ИЗКЛ',
  controlsHint: '← → / A D — ход    SPACE — скок    ↓ / S — клякане    ESC — пауза',
} as const;
