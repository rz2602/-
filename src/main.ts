import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

const game = new Phaser.Game(gameConfig);

// Development-only handle for inspecting the running game from the console.
if (import.meta.env.DEV) {
  (window as unknown as { __MISHKONTIN__: Phaser.Game }).__MISHKONTIN__ = game;
}
