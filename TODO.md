# TODO / future ideas

Ideas collected during v0.1. **None of these are implemented.** Each belongs to a later
version and should be planned before implementation.

## Art & animation
- Forest kit leftovers: foreground leaves with uncut tops (`art/FUTURE_ART_REQUIREMENTS.md` §1).
  Unused kit masters (cliff bottoms, long bridge, bridge entrances, broken bridge) are archived
  for later levels.
- (Optional) wider wrap-seamless versions of the integrated wide background layers (3300-4500 px, right edge continuing into the left) to
  remove the mirror joins in the sky, mountains and forest layers: §2 of the same file.
- **Milestone:** high-resolution Mishkontin animation set matching the canon (wooden staff, gold
  M medallion), full multi-frame cycles, ~363x332 per frame: §3 of the same file.
- Optional: a visible river again (`RIVER_VISIBLE`) once a seamless high-res river band and
  proper ravine-floor art exist.
- Higher-resolution master sprite set for Mishkontin (about 2x current frame size for 1440p, 3x
  for 4K); the current atlas is drawn at 170% on 1440p.
- Optional: ship two texture sets (1440p and 4K) and pick by render scale; mipmaps for POT
  textures when drawn below native size.
- Dedicated terrain pieces: cliff faces for tall walls, platform undersides, slope/ramp art.
- Waterfall animation (the high-res waterfall is static in v0.1.1).
- Pack forest pieces into a texture atlas (fewer textures/draw calls) and ship WebP.
- Final menu button/UI art (still a placeholder).
- Fix or redraw TURN frame 4 in the source sheet (Mishkontin holds a staff in *both* hands).
- Use the TURN sequence for direction changes while standing still (it is already registered as an animation).
- Contextual idle animations: look around, check the satchel, sit down, yawn
  (add `IdleVariant` entries in `src/entities/IdleBehaviour.ts`).
- Dedicated jump-apex and fall-to-land transition frames, plus a crouch-walk/crawl cycle.
- Dust puffs on landing and running turns. Footstep sync points in the run cycle.
- Ship the frame atlas as WebP/AVIF (or KTX2) to cut the 1.5 MB PNG. Trim unused TURN frames from gameplay builds.

## Movement & feel
- Real slopes (Arcade Physics has none). Consider a small step-up assist or Matter.js only if needed.
- Drop through one-way platforms (crouch + jump).
- Apex hang time / gravity modifiers for a floatier jump if playtests with children ask for it.
- Optional ledge-grab assist for near-misses.
- Gamepad support.
- Per-surface feel (mud, leaves, logs).

## Camera
- Camera zones (lock vertical framing in specific areas, zoom for vistas; the finish pan is a first step).
- Gentle vertical look-down while crouching.

## Levels & world
- Proper level authoring (Tiled maps), loaded through the existing `LevelDef` concept.
- More checkpoints per level, checkpoint activation animation and sound.
- Story levels and Sirengrad (later versions).

## Systems
- Audio: music, ambience, UI and footstep sounds, volume settings. Hook into
  `GameEvents.CheckpointActivated` and `GameEvents.WaterSplash`.
- Swimming / water traversal (water is a respawn zone for now).
- Settings: volume, language, accessibility (reduced motion, larger UI text, key remapping).
- Save slots, save migration tests when `SAVE_VERSION` changes.
- Virtues, collectibles and story flags (fields already reserved in the save data).
- Automated tests: unit tests for `PlayerStateMachine`/`SaveSystem`, and a headless
  playthrough bot in CI (a prototype was used during v0.1 development).

## Later-version content (explicitly out of scope for v0.1)
- King Mortis, Belagor, Iskritsa, Letokril, Troshko.
- Enemies and combat (HURT state and knockback already exist).
- Dialogue system, inventory, achievements, story cutscenes.
- Mobile/touch controls.
