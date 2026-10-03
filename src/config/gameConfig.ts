import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GRAVITY_Y } from './constants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { ForestTestScene } from '../scenes/ForestTestScene';
import { PauseScene } from '../scenes/PauseScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL with automatic Canvas fallback
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1d2a1f',
  banner: false,
  scale: {
    mode: Phaser.Scale.FIT, // responsive, keeps 16:9
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false, // toggled at runtime by DebugOverlay
    },
  },
  scene: [BootScene, PreloadScene, MainMenuScene, SettingsScene, ForestTestScene, PauseScene],
};
