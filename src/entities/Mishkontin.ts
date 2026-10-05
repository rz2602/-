import Phaser from 'phaser';
import {
  AssetKeys,
  DEPTH,
  PLAYER_ANIMATION,
  PLAYER_ASSISTS,
  PLAYER_BODY,
  PLAYER_MOVEMENT,
  CHARACTER_MOTION,
  PLAYER_SCALE,
  USE_MISHKONTIN_V2,
} from '../config/constants';
import type { InputSystem } from '../systems/InputSystem';
import { IdleBehaviour } from './IdleBehaviour';
import {
  type CharacterAnimSet,
  getMishkontinManifest,
  getMishkontinV2Manifest,
  LegacyAnimSet,
  MishkontinV2Anims,
  PERSONALITY_V2,
  type PersonalityAnimation,
  V2AnimSet,
} from './mishkontinAnimations';
import { PlayerState, PlayerStateMachine, type PlayerStateInput } from './PlayerStateMachine';

const TURN_MIN_SPEED = 10;

/**
 * The protagonist: movement, jump assists and animation selection.
 * Rendering uses either the high-resolution V2 atlas or the legacy atlas
 * (USE_MISHKONTIN_V2); in both the sprite's origin is the shared foot anchor,
 * so `y` is always the feet position, and the collision body is identical in
 * logical px (torso + legs only - ears, cloak, staff and tail never collide).
 */
export class Mishkontin extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  private readonly stateMachine = new PlayerStateMachine();
  private readonly anim: CharacterAnimSet;
  private readonly idleBehaviour: IdleBehaviour;
  /** Legacy-atlas px -> this sprite's frame px (body sizes are defined in legacy px). */
  private readonly bodyUnit: number;
  /** Playing personality animation (wave, read map...), until gameplay takes over. */
  private personality: PersonalityAnimation | null = null;
  private lastState: PlayerState = PlayerState.Idle;
  private stateStartedAt = 0;
  private runPhase = 0;
  private runLeftAt = -Infinity;
  private readonly runMinRate: number;
  /** Visual-only offset (render interpolation between physics steps); applied only while rendering. */
  private renderOffsetX = 0;
  private renderOffsetY = 0;
  private renderOffsetApplied = false;
  private readonly stateInput: PlayerStateInput = {
    now: 0,
    grounded: false,
    justLanded: false,
    landingSpeed: 0,
    velocityX: 0,
    velocityY: 0,
    moveX: 0,
    crouchHeld: false,
    hurtActive: false,
    landAnimationDone: true,
  };
  private readonly anchorX: number;
  private readonly anchorY: number;

  private facing: 1 | -1 = 1;
  private grounded = false;
  private lastGroundedAt = -Infinity;
  private jumpedSinceGrounded = false;
  private jumpCutAvailable = false;
  private previousVelocityY = 0;
  private hurtUntil = 0;
  private landAnimationDone = true;
  private crouchBodyActive = false;
  private frozen = false;
  /** Gameplay clock of the last update (simulation time, see ForestTestScene). */
  private now = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: InputSystem,
  ) {
    let scale: number;
    let anchor: { x: number; y: number };
    let cell: { width: number; height: number };
    if (USE_MISHKONTIN_V2) {
      const v2 = getMishkontinV2Manifest(scene);
      super(scene, x, y, AssetKeys.mishkontinV2, v2.animations.idle[0]);
      scale = 1 / v2.runtimePxPerLogical;
      anchor = v2.anchor;
      cell = v2.cell;
      this.anim = V2AnimSet;
    } else {
      const legacy = getMishkontinManifest(scene);
      super(scene, x, y, AssetKeys.mishkontin, legacy.animations.idle[0]);
      scale = PLAYER_SCALE;
      anchor = legacy.anchor;
      cell = { width: legacy.frameWidth, height: legacy.frameHeight };
      this.anim = LegacyAnimSet;
    }
    this.anchorX = anchor.x;
    this.anchorY = anchor.y;
    this.bodyUnit = PLAYER_SCALE / scale;
    this.idleBehaviour = new IdleBehaviour(this.anim);
    // Legacy keeps its original cadence clamp; V2 uses the tuned motion values.
    this.runMinRate = USE_MISHKONTIN_V2 ? CHARACTER_MOTION.runMinRate : 0.55;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(anchor.x / cell.width, anchor.y / cell.height);
    this.setScale(scale);
    this.setDepth(DEPTH.player);

    this.body.setMaxVelocity(PLAYER_MOVEMENT.maxSpeedX, PLAYER_MOVEMENT.maxFallSpeed);
    this.body.setDragX(PLAYER_MOVEMENT.dragX);
    this.body.setCollideWorldBounds(true);
    this.applyBodySize(PLAYER_BODY.standingHeight);

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimationComplete, this);
    if (CHARACTER_MOTION.renderInterpolation) {
      const events = scene.events;
      events.on(Phaser.Scenes.Events.POST_UPDATE, this.computeRenderOffset, this);
      events.on(Phaser.Scenes.Events.PRE_RENDER, this.applyRenderOffset, this);
      events.on(Phaser.Scenes.Events.RENDER, this.removeRenderOffset, this);
      this.once(Phaser.GameObjects.Events.DESTROY, () => {
        events.off(Phaser.Scenes.Events.POST_UPDATE, this.computeRenderOffset, this);
        events.off(Phaser.Scenes.Events.PRE_RENDER, this.applyRenderOffset, this);
        events.off(Phaser.Scenes.Events.RENDER, this.removeRenderOffset, this);
      });
    }
    this.idleBehaviour.reset();
    this.play(this.anim.idle);
  }

  /** Where Mishkontin is DRAWN (physics position + render interpolation); the camera follows this. */
  get viewX(): number {
    return this.x + this.renderOffsetX;
  }

  get viewY(): number {
    return this.y + this.renderOffsetY;
  }

  /**
   * Render interpolation. Physics steps at a fixed 60 Hz; between steps the
   * sprite is drawn where the body was `elapsed` ms after the previous step,
   * i.e. between the last two step positions (never ahead of them, so it can
   * never sink into the ground or a wall). Computed after the physics sync,
   * applied only for drawing and removed straight after - physics, collision
   * and all game logic only ever see the real position.
   */
  private computeRenderOffset(): void {
    const world = this.scene.physics.world;
    // Phaser keeps the fixed-step accumulator private; read it without widening its public type.
    const internals = world as unknown as { _frameTimeMS: number; _elapsed: number };
    const stepMs = internals._frameTimeMS;
    const elapsed = internals._elapsed;
    if (!world.fixedStep || !this.body.enable || world.isPaused || !(stepMs > 0)) {
      this.renderOffsetX = this.renderOffsetY = 0;
      return;
    }
    const behind = (1 - Phaser.Math.Clamp(elapsed / stepMs, 0, 1)) * (stepMs / 1000);
    this.renderOffsetX = -this.body.velocity.x * behind;
    this.renderOffsetY = -this.body.velocity.y * behind;
  }

  private applyRenderOffset(): void {
    if (this.renderOffsetApplied) return;
    this.x += this.renderOffsetX;
    this.y += this.renderOffsetY;
    this.renderOffsetApplied = true;
  }

  private removeRenderOffset(): void {
    if (!this.renderOffsetApplied) return;
    this.x -= this.renderOffsetX;
    this.y -= this.renderOffsetY;
    this.renderOffsetApplied = false;
  }

  /**
   * Plays a personality / story animation (V2 only) while Mishkontin is idle.
   * Any movement, jump, fall or hurt immediately ends it. Returns false when
   * it cannot play now.
   */
  playPersonality(name: PersonalityAnimation): boolean {
    if (!USE_MISHKONTIN_V2 || this.stateMachine.state !== PlayerState.Idle) return false;
    this.personality = name;
    this.play(PERSONALITY_V2[name].anim);
    return true;
  }

  get personalityAnimation(): PersonalityAnimation | null {
    return this.personality;
  }

  /** @param time simulation time in ms (advances by `delta`, like the physics). */
  override update(time: number, delta: number): void {
    this.now = time;
    const body = this.body;
    const input = this.controls.state;
    const hurtActive = time < this.hurtUntil;
    const locked = hurtActive || this.frozen;

    // --- ground tracking -------------------------------------------------
    const wasGrounded = this.grounded;
    this.grounded = body.blocked.down || body.touching.down;
    const justLanded = this.grounded && !wasGrounded;
    const landingSpeed = justLanded ? this.previousVelocityY : 0;
    // Ground contact was lost during this frame's physics step, so the coyote
    // window starts now, not at the previous (still grounded) frame.
    if (this.grounded || wasGrounded) this.lastGroundedAt = time;
    if (this.grounded && body.velocity.y >= 0) this.jumpedSinceGrounded = false;

    // --- crouch -----------------------------------------------------------
    const crouching = !locked && this.grounded && input.crouch;
    this.setCrouchBody(crouching);

    // --- horizontal movement ---------------------------------------------
    const moveX = locked || crouching ? 0 : input.moveX;
    if (moveX !== 0) {
      const turning = Math.sign(body.velocity.x) === -moveX && Math.abs(body.velocity.x) > TURN_MIN_SPEED;
      const accel = PLAYER_MOVEMENT.acceleration * (turning ? PLAYER_MOVEMENT.turnAccelerationMultiplier : 1);
      body.setAccelerationX(moveX * accel);
    } else {
      body.setAccelerationX(0);
    }
    // Arcade applies drag only while acceleration is zero.
    body.setDragX(this.grounded ? PLAYER_MOVEMENT.dragX : PLAYER_MOVEMENT.airDragX);

    if (!locked && input.moveX !== 0) this.setFacing(input.moveX > 0 ? 1 : -1);

    // --- jump: coyote time + jump buffer + variable height ---------------
    if (!locked) this.tryJump(time);
    if (this.jumpCutAvailable) {
      if (body.velocity.y >= 0) {
        this.jumpCutAvailable = false;
      } else if (!input.jumpHeld) {
        body.setVelocityY(body.velocity.y * PLAYER_MOVEMENT.jumpCutMultiplier);
        this.jumpCutAvailable = false;
      }
    }

    // --- state + animation ------------------------------------------------
    const s = this.stateInput;
    s.now = time;
    s.grounded = this.grounded && body.velocity.y >= 0;
    s.justLanded = justLanded;
    s.landingSpeed = landingSpeed;
    s.velocityX = body.velocity.x;
    s.velocityY = body.velocity.y;
    s.moveX = moveX;
    s.crouchHeld = crouching;
    s.hurtActive = hurtActive;
    s.landAnimationDone = this.landAnimationDone;
    const changed = this.stateMachine.update(s);
    this.updateAnimation(changed, delta);

    this.previousVelocityY = body.velocity.y;
  }

  /** Plays the hurt reaction with a gentle knockback away from `sourceX`. */
  hurt(sourceX = this.x - this.facing): void {
    if (this.now < this.hurtUntil) return;
    this.hurtUntil = this.now + PLAYER_ANIMATION.hurtDurationMs;
    const away = this.x >= sourceX ? 1 : -1;
    this.body.setAcceleration(0, 0);
    this.body.setVelocity(away * PLAYER_ANIMATION.hurtKnockbackX, PLAYER_ANIMATION.hurtKnockbackY);
    this.jumpCutAvailable = false;
  }

  /** Disables player control (finish sequence) while keeping physics and animation alive. */
  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    if (frozen) this.body.setAccelerationX(0);
  }

  /** Teleports to a feet position and resets all transient state. */
  respawnAt(x: number, y: number): void {
    this.removeRenderOffset();
    this.renderOffsetX = this.renderOffsetY = 0;
    this.body.reset(x, y);
    this.body.setAcceleration(0, 0);
    // A visual tween (e.g. fading out in water) must never outlive the respawn.
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.hurtUntil = 0;
    this.grounded = false;
    this.lastGroundedAt = -Infinity;
    this.jumpedSinceGrounded = false;
    this.jumpCutAvailable = false;
    this.previousVelocityY = 0;
    this.landAnimationDone = true;
    this.setCrouchBody(false);
    this.setFacing(1);
    this.stateMachine.reset(PlayerState.Idle, this.now);
    this.idleBehaviour.reset();
    this.personality = null;
    this.play(this.anim.idle);
  }

  get playerState(): PlayerState {
    return this.stateMachine.state;
  }

  get isGrounded(): boolean {
    return this.grounded;
  }

  get facingDirection(): 1 | -1 {
    return this.facing;
  }

  /** Remaining coyote window in ms (0 when unavailable); for the debug overlay. */
  coyoteRemainingMs(): number {
    if (this.grounded || this.jumpedSinceGrounded) return 0;
    return Math.max(0, PLAYER_ASSISTS.coyoteTimeMs - (this.now - this.lastGroundedAt));
  }

  private tryJump(time: number): void {
    const buffered = time - this.controls.state.lastJumpPressedAt <= PLAYER_ASSISTS.jumpBufferMs;
    if (!buffered) return;
    const withinCoyote = time - this.lastGroundedAt <= PLAYER_ASSISTS.coyoteTimeMs;
    if (!(this.grounded || withinCoyote) || this.jumpedSinceGrounded) return;

    this.body.setVelocityY(PLAYER_MOVEMENT.jumpVelocity);
    this.controls.consumeJump();
    this.jumpedSinceGrounded = true;
    this.jumpCutAvailable = true;
    this.grounded = false;
    this.setCrouchBody(false);
  }

  private updateAnimation(stateChanged: boolean, delta: number): void {
    const state = this.stateMachine.state;
    const previous = this.lastState;
    this.lastState = state;
    if (stateChanged) this.stateStartedAt = this.now;
    if (stateChanged && state === PlayerState.Idle) this.idleBehaviour.reset();
    // Gameplay always wins over a personality animation (straight into the new
    // state's animation - no idle frame in between).
    if (this.personality && (state !== PlayerState.Idle || this.controls.state.moveX !== 0)) {
      this.personality = null;
      this.idleBehaviour.reset();
    }
    if (previous === PlayerState.Run && state !== PlayerState.Run) this.rememberRunPhase();

    switch (state) {
      case PlayerState.Idle:
        if (this.personality) break;
        // Getting up from a crouch plays its short rise before idle (V2).
        if (stateChanged && previous === PlayerState.Crouch && this.anim.crouchRise) {
          this.play(this.anim.crouchRise);
          break;
        }
        if (this.anims.currentAnim?.key === this.anim.crouchRise && this.anims.isPlaying) break;
        this.playIfNotCurrent(this.idleBehaviour.update(delta));
        break;
      case PlayerState.Run: {
        if (this.anims.currentAnim?.key !== this.anim.run) this.startRun(previous);
        // Cadence follows the real horizontal speed (continuous, clamped), so
        // starting, stopping and short taps read as steps instead of a sprint.
        const speedRatio = Math.abs(this.body.velocity.x) / PLAYER_MOVEMENT.maxSpeedX;
        this.anims.timeScale = Phaser.Math.Clamp(speedRatio, this.runMinRate, 1);
        return;
      }
      case PlayerState.Jump:
        this.playIfNotCurrent(this.anim.jump);
        break;
      case PlayerState.Fall: {
        // Apex: keep the rising pose until the body is clearly descending.
        const fromJump = this.anims.currentAnim?.key === this.anim.jump;
        if (fromJump && this.anim.fallLong && this.body.velocity.y < CHARACTER_MOTION.apexHoldUntilVelocityY) break;
        const long = this.anim.fallLong && this.now - this.stateStartedAt > CHARACTER_MOTION.longFallAfterMs;
        this.playIfNotCurrent(long ? this.anim.fallLong! : this.anim.fall);
        break;
      }
      case PlayerState.Land:
        if (stateChanged) {
          this.landAnimationDone = false;
          this.play(this.anim.land);
        }
        break;
      case PlayerState.Crouch:
        if (stateChanged) this.play(this.anim.crouch);
        break;
      case PlayerState.Hurt:
        if (stateChanged) this.play(this.anim.hurt);
        break;
    }
    this.anims.timeScale = 1;
  }

  /**
   * Enters the run loop on the frame that best continues the current pose,
   * or resumes the previous run phase after a very short interruption.
   */
  private startRun(previous: PlayerState): void {
    if (!this.anim.fallLong) {
      this.play(this.anim.run); // legacy art set: unchanged behaviour
      return;
    }
    const runFrames = this.scene.anims.get(this.anim.run).frames.length;
    const frameAt = (phase: number) => Math.round(phase * runFrames) % runFrames;
    let startFrame = frameAt(CHARACTER_MOTION.runEntryPhase);
    if (this.now - this.runLeftAt <= CHARACTER_MOTION.runResumeWindowMs) startFrame = this.runPhase % runFrames;
    else if (previous === PlayerState.Land) startFrame = frameAt(CHARACTER_MOTION.runAfterLandPhase);
    this.play({ key: this.anim.run, startFrame });
  }

  private rememberRunPhase(): void {
    const anim = this.anims.currentAnim;
    const frame = this.anims.currentFrame;
    if (!frame || !anim || anim.key !== this.anim.run) return;
    this.runPhase = (anim.frames.indexOf(frame) + 1) % anim.frames.length; // continue with the next frame
    this.runLeftAt = this.now;
  }

  private playIfNotCurrent(key: string): void {
    if (this.anims.currentAnim?.key !== key) this.play(key);
  }

  private onAnimationComplete(animation: Phaser.Animations.Animation): void {
    switch (animation.key) {
      case this.anim.land:
        this.landAnimationDone = true;
        break;
      case this.anim.crouch:
        if (this.stateMachine.state === PlayerState.Crouch) this.play(this.anim.crouchHold);
        break;
      case MishkontinV2Anims.sleep:
        if (this.personality === 'sleep') this.play(MishkontinV2Anims.sleepLoop);
        break;
      default:
        // One-shot personality animations return to idle; idle variants report back.
        if (this.personality && !PERSONALITY_V2[this.personality].loops && animation.key === PERSONALITY_V2[this.personality].anim) {
          this.personality = null;
          this.idleBehaviour.reset();
          this.play(this.anim.idle);
          break;
        }
        this.idleBehaviour.onVariantComplete(animation.key);
    }
  }

  private setFacing(direction: 1 | -1): void {
    if (direction === this.facing) return;
    this.facing = direction;
    this.setFlipX(direction < 0);
    this.updateBodyOffset();
  }

  private setCrouchBody(crouch: boolean): void {
    if (crouch === this.crouchBodyActive) return;
    this.crouchBodyActive = crouch;
    this.applyBodySize(crouch ? PLAYER_BODY.crouchHeight : PLAYER_BODY.standingHeight);
  }

  /** Resizes the body keeping its bottom edge exactly on the feet. */
  private applyBodySize(height: number): void {
    this.body.setSize(PLAYER_BODY.width * this.bodyUnit, height * this.bodyUnit, false);
    this.updateBodyOffset();
  }

  private updateBodyOffset(): void {
    const u = this.bodyUnit;
    const offsetX = this.anchorX - (PLAYER_BODY.width * u) / 2 + PLAYER_BODY.offsetXFromAnchor * u * this.facing;
    const offsetY = this.anchorY - this.body.sourceHeight;
    this.body.setOffset(offsetX, offsetY);
  }
}
