# Mishkontin V2 — movement & animation polish report

## 1. Baseline
`7f98f92` on `Mishkontin`, clean tree. No art, physics values or collision were changed.

## 2. Diagnosis

| Suspect | Finding |
|---|---|
| C. Animation restarting | **Not a cause.** Loops use `playIfNotCurrent`; one-shots play only on state change. |
| I/K. Position stepping | **Main cause.** Arcade physics steps at a fixed 60 Hz and the sprite only moves when a step happens. Measured drawn movement per frame: 60 Hz `3.83` every frame; **120 Hz `3.83, 0, 3.83, 0…`; 144 Hz `0, 3.83, 0, 0…`**. On high-refresh displays Mishkontin moved in steps while the camera eased every frame, so the character judders against the world. At 60 Hz an occasional 0- or 2-step frame gives the same hitch. |
| A/L. Run FPS vs velocity | **Cause.** 12 fps over the 8-frame cycle: the planted foot covers ~16 logical px per frame, so the feet match the ground at ~14 fps for 230 px/s. 12 fps gave ~17 % skating and a slightly slow-motion run. |
| F/O. Idle | **Cause.** idle frame 2 has **closed eyes** and frames 3–4 change expression (look up, open mouth). Looping all six at 5 fps meant a blink every 1.2 s plus a face change every 200 ms, which read as restless and frame-by-frame. |
| F. Blink | **Cause.** The separate blink sheet is drawn in a different pose (silhouette IoU with idle 0.68–0.70, against 0.84–0.90 between idle frames), so every blink popped the whole body. |
| M. Jump → fall | **Cause.** The rising sequence switched at vy > −60 straight into fall frames 0–2, a frantic arm-flail loop at 8 fps. |
| N. Landing | Minor: even timing; land → run waited 90 ms. |
| O. Idle → run | Minor: run always started at frame 0 (IoU 0.61 with idle); frame 2 continues the idle silhouette best (0.64). |
| G. Direction change | **Not a cause.** Run is not restarted on reversal; the phase is kept. |
| E/P. Anchors / frame sizes | **Not a cause.** The shared cell plus fur-centroid / feet anchors keep the body steady (verified with filmstrips); no scale pop. |
| J. Camera | Indirect: it followed the stepped position one render frame late. It now follows the drawn (interpolated) position. Lerp values are unchanged. |
| roundPixels | Already `false` (with `pixelArt: false`, `antialias: true`); not a cause. |

**About 4.5 fps.** That is the swiftshader software renderer in the headless test container, not the game. No timing was tuned against it: everything here is in game-time milliseconds and was verified with deterministic stepping at 30/60/120/144 Hz. Real-browser FPS can't be measured in this container (no GPU).

## 3. Changes (visual only)

All tuning values are in `CHARACTER_MOTION` (`src/config/constants.ts`).

- **Render interpolation** (`renderInterpolation`). After the physics sync, Mishkontin's drawn position is set between the last two physics steps (offset = −velocity × the time still to the next step). It is applied in `PRE_RENDER` and removed in `RENDER`, so physics, collision and all logic only ever see the real position. It can never draw ahead of the simulation, so feet can't sink into ground or walls. Measured drawn speed while running: **230 px/s on every frame at 60, 120 and 144 Hz and with jittery 15–18 ms frames**.
- **Camera** follows `viewX/viewY` (the drawn position) and now updates after the physics sync, together with the background layers. Follow lerp is unchanged: X 0.09, Y 0.08.
- **Run.**
  - 12 → **14 fps** at full speed.
  - Continuous cadence = speed ratio, clamped at **0.6** (≈ 8.4 fps). Legacy keeps 0.55.
  - Enters on **frame 2** (best idle match).
  - After landing it enters on **frame 7** (best match to the recovery pose, IoU 0.76).
  - A return to running within 250 ms **continues the previous phase**.
  - Reversal keeps the phase. Turn stays not auto-triggered, so direction response is immediate.
- **Idle.** Calm open-eyed loop: frames 0 (620 ms), 1 (520), 5 (600), 1 (520). The **blink** variant reuses the same pose: idle 0 (60) → idle 2, eyes closed (130) → idle 0 (90). It plays after 5 s idle, then every 3–7 s (was 2.5–5 s). The blink sheet stays available as `playPersonality('blink')`.
- **Jump.**
  - Launch 70 ms → rise 150 ms → peak pose held.
  - **Apex:** the peak pose holds until vy > +70 px/s (visual hysteresis; no hang time added).
  - **Descent:** the calm jump frame 4.
  - The frantic flail (fall 1–2) plays only on **long falls** (> 650 ms, longer than a full jump's descent).
- **Landing.**
  - Squash 60 ms → low 80 ms → recover 120 ms.
  - Land → run can cut in after **70 ms** (was 90; LAND never locked movement).
  - Land → idle plays the full recovery.
- **Crouch.** Down 50/50 ms → hold. New **rise** on release (crouch 2 → 1, 110 ms) before idle; moving or jumping skips it.
- **Personality → movement.** The new state's animation starts on the same frame, with no idle frame in between. Verified: sit → run, sleep → jump, read_map → crouch.
- **Squash/stretch.** Not added (optional). The landing squash in the art already reads well.

## 4. Before / after (frame sequences, 60 Hz logic)

| Sequence | After |
|---|---|
| Standing jump | jump 0 @0 → 1 @5 → peak 2 @14 (held through the apex) → descent @31 → land @52 → idle @68 |
| 100 ms tap | run frame 2 → 3 → idle (a small step) |
| Release from full run | run continues ~130 ms while decelerating, then idle |
| Reversal | run phase continues 2 → 6, no restart |
| Drop into the hollow | calm descent → land 0,1 → run frame 7 after 70 ms |

Rendered BEFORE/AFTER strips at 120 Hz were captured for idle → run, full run, run → idle, reversal, jump/apex and landing → run.

## 5. Physics
**PHYSICS UNCHANGED.**
- All `PLAYER_MOVEMENT`, gravity and assist values are the same.
- Fixed-step physics is kept.
- `landInterruptAfterMs` 90 → 70 is an animation-state timing; movement was never locked during LAND.

Frame-rate audit (fixed-step physics):
- Jump height is 101 px at 30, 60, 120 and 144 Hz.
- 1 s run distance is 254 px at 60/120/144 Hz and 247 px at 30 Hz. Input is sampled per rendered frame (existing behaviour).

## 6. Collision
Identical before and after: 39.1 × 73.1 logical px, offset −17.85 / −73.1 from the feet.

## 7. Resolution QA
At 1280×720, 1920×1080, 2560×1440 and 1440×900 @2×:
- parallax factors exact
- bounds 0…12040
- feet on the ground
- no errors
- Main Menu pixel-identical (720p, 1440p, HiDPI)

## 8. Regression
- Mechanics: **18/18** at 1280×720 and **18/18** at 1920×1080.
- Real-keyboard test: pass.
- Bot: **54.7 s, 0 respawns** (identical).

## 9. Remaining movement debt
- Run → idle switches straight from the current run frame to idle. A dedicated stop pose would need new art.
- Turn is still not auto-triggered; it's a 180° back-view turn and would slow reversals.
- Real-GPU FPS was not measurable in the container; a check on a 120 Hz display is recommended.

## 10. Files changed
- `src/config/constants.ts`: `CHARACTER_MOTION`, `landInterruptAfterMs`, idle blink gap
- `src/entities/Mishkontin.ts`: run cadence/phase/entry, apex/long fall, crouch rise, render interpolation, `viewX/viewY`
- `src/entities/mishkontinAnimations.ts`: per-frame durations, new idle/blink/fall/crouch-rise definitions
- `src/systems/CameraController.ts`: follows the drawn position
- `src/scenes/ForestTestScene.ts`: camera and background update after the physics sync
- This report, `CHANGELOG.md`, `README.md`
