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
} as const;

export const AssetKeys = {
  mishkontinManifest: 'mishkontin-frames-manifest',
  mishkontin: 'mishkontin',
  forestManifest: 'forest-assets-manifest',
} as const;

export const AssetPaths = {
  mishkontinManifest: 'assets/characters/mishkontin/generated/mishkontin-frames.json',
  mishkontinFrames: 'assets/characters/mishkontin/generated/mishkontin-frames.png',
  forestManifest: 'assets/environments/forest/forest-assets.json',
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
 * Rendering scale of Mishkontin. The atlas is kept at source resolution so it
 * stays sharp when the canvas is scaled up on large screens.
 */
export const PLAYER_SCALE = 0.85;

/**
 * Collision body in UNSCALED atlas-frame pixels (Phaser scales it with the
 * sprite). The body covers torso + legs only: ears, cloak, staff and tail are
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
  alternateIdleMinGapMs: 2500,
  alternateIdleMaxGapMs: 5000,
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
  title: 'МИШКОНТИН',
  subtitle: 'и кралят плъх Мортис',
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
