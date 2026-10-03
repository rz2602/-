import Phaser from 'phaser';
import {
  AssetKeys,
  DEPTH,
  PLAYER_ANIMATION,
  PLAYER_ASSISTS,
  PLAYER_BODY,
  PLAYER_MOVEMENT,
  PLAYER_SCALE,
} from '../config/constants';
import type { InputSystem } from '../systems/InputSystem';
import { IdleBehaviour } from './IdleBehaviour';
import { getMishkontinManifest, MishkontinAnims, type MishkontinAnimKey } from './mishkontinAnimations';
import { PlayerState, PlayerStateMachine, type PlayerStateInput } from './PlayerStateMachine';

const TURN_MIN_SPEED = 10;

/**
 * The protagonist: movement, jump assists and animation selection.
 * Rendering uses the preprocessed frames of the supplied artwork; the sprite's
 * origin is the shared foot anchor, so `y` is always the feet position.
 */
export class Mishkontin extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  private readonly stateMachine = new PlayerStateMachine();
  private readonly idleBehaviour = new IdleBehaviour();
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
    const manifest = getMishkontinManifest(scene);
    super(scene, x, y, AssetKeys.mishkontin, manifest.animations.idle[0]);
    this.anchorX = manifest.anchor.x;
    this.anchorY = manifest.anchor.y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(manifest.anchor.originX, manifest.anchor.originY);
    this.setScale(PLAYER_SCALE);
    this.setDepth(DEPTH.player);

    this.body.setMaxVelocity(PLAYER_MOVEMENT.maxSpeedX, PLAYER_MOVEMENT.maxFallSpeed);
    this.body.setDragX(PLAYER_MOVEMENT.dragX);
    this.body.setCollideWorldBounds(true);
    this.applyBodySize(PLAYER_BODY.standingHeight);

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimationComplete, this);
    this.idleBehaviour.reset();
    this.play(MishkontinAnims.idle);
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
    this.body.reset(x, y);
    this.body.setAcceleration(0, 0);
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
    this.play(MishkontinAnims.idle);
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
    if (stateChanged && state === PlayerState.Idle) this.idleBehaviour.reset();

    switch (state) {
      case PlayerState.Idle:
        this.playIfNotCurrent(this.idleBehaviour.update(delta));
        break;
      case PlayerState.Run: {
        this.playIfNotCurrent(MishkontinAnims.run);
        // Cadence follows speed so feet don't skate while accelerating.
        const speedRatio = Math.abs(this.body.velocity.x) / PLAYER_MOVEMENT.maxSpeedX;
        this.anims.timeScale = Phaser.Math.Clamp(speedRatio, 0.55, 1);
        return;
      }
      case PlayerState.Jump:
        this.playIfNotCurrent(MishkontinAnims.jump);
        break;
      case PlayerState.Fall:
        this.playIfNotCurrent(MishkontinAnims.fall);
        break;
      case PlayerState.Land:
        if (stateChanged) {
          this.landAnimationDone = false;
          this.play(MishkontinAnims.land);
        }
        break;
      case PlayerState.Crouch:
        if (stateChanged) this.play(MishkontinAnims.crouch);
        break;
      case PlayerState.Hurt:
        if (stateChanged) this.play(MishkontinAnims.hurt);
        break;
    }
    this.anims.timeScale = 1;
  }

  private playIfNotCurrent(key: MishkontinAnimKey): void {
    if (this.anims.currentAnim?.key !== key) this.play(key);
  }

  private onAnimationComplete(animation: Phaser.Animations.Animation): void {
    switch (animation.key) {
      case MishkontinAnims.land:
        this.landAnimationDone = true;
        break;
      case MishkontinAnims.crouch:
        if (this.stateMachine.state === PlayerState.Crouch) this.play(MishkontinAnims.crouchHold);
        break;
      default:
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
    this.body.setSize(PLAYER_BODY.width, height, false);
    this.updateBodyOffset();
  }

  private updateBodyOffset(): void {
    const offsetX = this.anchorX - PLAYER_BODY.width / 2 + PLAYER_BODY.offsetXFromAnchor * this.facing;
    const offsetY = this.anchorY - this.body.sourceHeight;
    this.body.setOffset(offsetX, offsetY);
  }
}
