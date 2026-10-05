import Phaser from 'phaser';
import { GRAVITY_Y } from './constants';
import { RenderScale } from '../systems/RenderScale';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { ForestTestScene } from '../scenes/ForestTestScene';
import { PauseScene } from '../scenes/PauseScene';
import { AnimationLabScene } from '../scenes/AnimationLabScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL with automatic Canvas fallback
  parent: 'game',
  // Backbuffer at real device resolution; cameras zoom the 1280x720 logical view (RenderScale).
  width: RenderScale.canvasWidth,
  height: RenderScale.canvasHeight,
  backgroundColor: '#1d2a1f',
  banner: false,
  scale: {
    mode: Phaser.Scale.FIT, // responsive, keeps 16:9
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Illustrated art: smooth (LINEAR) texture filtering, no pixel snapping.
  // antialiasGL stays on: turning MSAA off changes edge pixels of the locked
  // Main Menu. Frame-rate protection is the adaptive render scale instead
  // (systems/RenderScale.ts). Prefer the discrete GPU on dual-GPU laptops.
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false, // toggled at runtime by DebugOverlay
    },
  },
  scene: [BootScene, PreloadScene, MainMenuScene, SettingsScene, ForestTestScene, PauseScene, AnimationLabScene],
};
