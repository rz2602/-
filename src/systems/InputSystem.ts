import Phaser from 'phaser';

/**
 * Snapshot of player intent for one frame. The same object is reused every
 * frame to avoid allocations in update().
 */
export interface PlayerInput {
  /** -1 left, 0 none, 1 right. */
  moveX: number;
  crouch: boolean;
  jumpHeld: boolean;
  /** Simulation time (ms) of the most recent jump press, or -Infinity. */
  lastJumpPressedAt: number;
}

const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

function anyDown(keys: Phaser.Input.Keyboard.Key[]): boolean {
  for (const key of keys) if (key.isDown) return true;
  return false;
}

/**
 * Keyboard mapping for gameplay:
 *   A / Left  = left, D / Right = right, SPACE (also W / Up) = jump,
 *   S / Down = crouch, ESC = pause, F3 or ` = debug toggle.
 */
export class InputSystem {
  readonly state: PlayerInput = { moveX: 0, crouch: false, jumpHeld: false, lastJumpPressedAt: -Infinity };

  private readonly left: Phaser.Input.Keyboard.Key[];
  private readonly right: Phaser.Input.Keyboard.Key[];
  private readonly jump: Phaser.Input.Keyboard.Key[];
  private readonly crouch: Phaser.Input.Keyboard.Key[];
  private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
  private enabled = true;
  private jumpPressQueued = false;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is not available');
    this.keyboard = keyboard;

    const add = (code: number) => keyboard.addKey(code, true);
    this.left = [add(KeyCodes.A), add(KeyCodes.LEFT)];
    this.right = [add(KeyCodes.D), add(KeyCodes.RIGHT)];
    this.jump = [add(KeyCodes.SPACE), add(KeyCodes.W), add(KeyCodes.UP)];
    this.crouch = [add(KeyCodes.S), add(KeyCodes.DOWN)];

    // Record jump presses as events so a press is never missed between frames.
    for (const key of this.jump) key.on('down', this.onJumpDown, this);
  }

  /**
   * Call once per frame before the player reads `state`. `simTimeMs` is the
   * gameplay clock; presses are stamped with it so assist windows stay
   * correct even when frames are slow.
   */
  update(simTimeMs: number): PlayerInput {
    const s = this.state;
    if (this.jumpPressQueued) {
      this.jumpPressQueued = false;
      if (this.enabled) s.lastJumpPressedAt = simTimeMs;
    }
    if (!this.enabled) {
      s.moveX = 0;
      s.crouch = false;
      s.jumpHeld = false;
      return s;
    }
    const left = anyDown(this.left);
    const right = anyDown(this.right);
    s.moveX = left === right ? 0 : left ? -1 : 1;
    s.crouch = anyDown(this.crouch);
    s.jumpHeld = anyDown(this.jump);
    return s;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.jumpPressQueued = false;
    this.state.lastJumpPressedAt = -Infinity;
    if (!enabled) this.keyboard.resetKeys();
  }

  /** Consumes the buffered jump so one press triggers at most one jump. */
  consumeJump(): void {
    this.state.lastJumpPressedAt = -Infinity;
  }

  /** Registers a handler for a one-shot key (pause, debug...). */
  onKey(code: number, handler: () => void): void {
    this.keyboard.addKey(code, true).on('down', handler);
  }

  destroy(): void {
    for (const key of this.jump) key.off('down', this.onJumpDown, this);
  }

  private onJumpDown(): void {
    if (this.enabled) this.jumpPressQueued = true;
  }
}
