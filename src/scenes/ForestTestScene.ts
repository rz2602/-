import Phaser from 'phaser';
import { RESPAWN, SceneKeys, STRINGS } from '../config/constants';
import { Mishkontin } from '../entities/Mishkontin';
import { FOREST_TEST_LEVEL } from '../levels/forestTestLevel';
import { buildLevel } from '../levels/LevelBuilder';
import { ParallaxBackground } from '../levels/ParallaxBackground';
import { CameraController } from '../systems/CameraController';
import { CheckpointSystem } from '../systems/CheckpointSystem';
import { DebugOverlay } from '../systems/DebugOverlay';
import { InputSystem } from '../systems/InputSystem';
import { RespawnController } from '../systems/RespawnController';
import { SaveSystem } from '../systems/SaveSystem';
import { HUD } from '../ui/HUD';

const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

/** Movement/animation/camera test course. Wires systems together; logic lives in them. */
export class ForestTestScene extends Phaser.Scene {
  private controls!: InputSystem;
  private player!: Mishkontin;
  private parallax!: ParallaxBackground;
  private cameraController!: CameraController;
  private checkpoints!: CheckpointSystem;
  private respawner!: RespawnController;
  private hud!: HUD;
  private debug!: DebugOverlay;
  private finished = false;
  /**
   * Gameplay clock: sum of Phaser's (capped, smoothed) frame deltas, the same
   * time base Arcade Physics uses. Assist windows (coyote, jump buffer) run on
   * it so they behave identically on slow frames.
   */
  private simTimeMs = 0;

  constructor() {
    super(SceneKeys.ForestTest);
  }

  create(): void {
    const level = FOREST_TEST_LEVEL;
    this.finished = false;
    this.simTimeMs = 0;

    // Open bottom so falling out of the level is detectable; sides keep the player in.
    this.physics.world.setBounds(0, 0, level.width, level.height);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.parallax = new ParallaxBackground(this, level.cameraBottom);
    const built = buildLevel(this, level);
    this.hud = new HUD(this);
    this.controls = new InputSystem(this);

    this.checkpoints = new CheckpointSystem(this, level.id, level.spawn, level.checkpoints, () =>
      this.hud.showToast(STRINGS.checkpoint),
    );
    const start = this.checkpoints.respawnPoint;
    this.player = new Mishkontin(this, start.x, start.y, this.controls);

    this.physics.add.collider(this.player, built.solids);
    this.physics.add.collider(this.player, built.platforms);
    this.checkpoints.watch(this.player);
    this.physics.add.overlap(this.player, built.finishZone, () => this.finishLevel());

    this.cameraController = new CameraController(this.cameras.main, this.player, level.width, level.cameraBottom);
    this.cameraController.snapToTarget();

    this.respawner = new RespawnController(this, this.player, this.checkpoints, this.controls, level.height, () => {
      this.cameraController.snapToTarget();
      this.hud.showToast(STRINGS.retry, RESPAWN.messageDurationMs);
    });

    const debugFromUrl = new URLSearchParams(window.location.search).has('debug');
    this.debug = new DebugOverlay(this, this.player, this.checkpoints, debugFromUrl || SaveSystem.settings.debugMode);

    this.controls.onKey(KeyCodes.ESC, () => this.pauseGame());
    this.controls.onKey(KeyCodes.F3, () => this.debug.toggle());
    this.controls.onKey(KeyCodes.BACKTICK, () => this.debug.toggle());
    this.controls.onKey(KeyCodes.H, () => {
      if (this.debug.isVisible && !this.finished) this.player.hurt();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controls.destroy());
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  override update(_time: number, delta: number): void {
    this.simTimeMs += delta;
    this.controls.update(this.simTimeMs);
    this.player.update(this.simTimeMs, delta);
    this.respawner.update();
    this.cameraController.update(delta);
    this.parallax.update(this.cameras.main);
    this.debug.update(delta);
  }

  private pauseGame(): void {
    if (this.finished || this.respawner.isRespawning) return;
    this.scene.launch(SceneKeys.Pause, { gameplayKey: this.scene.key });
    this.scene.pause();
  }

  private finishLevel(): void {
    if (this.finished) return;
    this.finished = true;
    this.controls.setEnabled(false);
    this.player.setFrozen(true);
    this.checkpoints.clearProgress();

    void this.hud.playFinishSequence().then(() => {
      let leaving = false;
      const backToMenu = () => {
        if (leaving) return;
        leaving = true;
        const camera = this.cameras.main;
        camera.fade(400, 0, 0, 0, true);
        camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SceneKeys.MainMenu));
      };
      this.input.keyboard?.once('keydown-ENTER', backToMenu);
      this.input.keyboard?.once('keydown-SPACE', backToMenu);
      this.input.keyboard?.once('keydown-ESC', backToMenu);
      this.input.once(Phaser.Input.Events.POINTER_UP, backToMenu);
    });
  }
}
