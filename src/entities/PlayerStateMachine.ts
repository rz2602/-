import { PLAYER_ANIMATION } from '../config/constants';

export const PlayerState = {
  Idle: 'IDLE',
  Run: 'RUN',
  Jump: 'JUMP',
  Fall: 'FALL',
  Land: 'LAND',
  Crouch: 'CROUCH',
  Hurt: 'HURT',
} as const;

export type PlayerState = (typeof PlayerState)[keyof typeof PlayerState];

/** Per-frame facts the state machine decides from. Reused, never reallocated. */
export interface PlayerStateInput {
  now: number;
  grounded: boolean;
  /** True only on the frame the player touched down. */
  justLanded: boolean;
  /** Downward speed at touchdown (px/s). */
  landingSpeed: number;
  velocityX: number;
  velocityY: number;
  moveX: number;
  crouchHeld: boolean;
  hurtActive: boolean;
  /** True once the current one-shot LAND animation has finished. */
  landAnimationDone: boolean;
}

const RUN_MIN_SPEED = 40;

/**
 * Chooses the gameplay/animation state by priority:
 *   HURT > LAND > JUMP/FALL > CROUCH > RUN > IDLE
 * The state only changes when the decision changes, so animations are never
 * restarted every frame.
 */
export class PlayerStateMachine {
  private current: PlayerState = PlayerState.Idle;
  private enteredAt = 0;

  get state(): PlayerState {
    return this.current;
  }

  get stateEnteredAt(): number {
    return this.enteredAt;
  }

  /** Returns true when the state changed this frame. */
  update(input: PlayerStateInput): boolean {
    const next = this.decide(input);
    if (next === this.current) return false;
    this.current = next;
    this.enteredAt = input.now;
    return true;
  }

  reset(state: PlayerState, now: number): void {
    this.current = state;
    this.enteredAt = now;
  }

  private decide(i: PlayerStateInput): PlayerState {
    if (i.hurtActive) return PlayerState.Hurt;

    // Getting back up after being hurt reuses the landing transition.
    if (this.current === PlayerState.Hurt && i.grounded) return PlayerState.Land;

    if (i.grounded) {
      if (i.justLanded && i.landingSpeed >= PLAYER_ANIMATION.landMinImpactVelocity) return PlayerState.Land;
      if (this.current === PlayerState.Land && this.shouldStayLanding(i)) return PlayerState.Land;
    } else {
      return i.velocityY < -PLAYER_ANIMATION.fallVelocityThreshold ? PlayerState.Jump : PlayerState.Fall;
    }

    if (i.crouchHeld) return PlayerState.Crouch;
    if (i.moveX !== 0 || Math.abs(i.velocityX) > RUN_MIN_SPEED) return PlayerState.Run;
    return PlayerState.Idle;
  }

  private shouldStayLanding(i: PlayerStateInput): boolean {
    if (i.landAnimationDone) return false;
    const elapsed = i.now - this.enteredAt;
    // Responsiveness first: moving or crouching cuts the landing short.
    if ((i.moveX !== 0 || i.crouchHeld) && elapsed >= PLAYER_ANIMATION.landInterruptAfterMs) return false;
    return true;
  }
}
