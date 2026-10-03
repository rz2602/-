# Мишконтин и кралят плъх Мортис

*Mishkontin and King Mortis the Rat*: a browser-based 2D action-adventure platformer for children.

**Current version: v0.1**, a movement, animation and camera prototype with one test level
(`ForestTestScene`). See [CHANGELOG.md](CHANGELOG.md) for what is included and
[TODO.md](TODO.md) for ideas planned for later versions.

## Requirements

- Node.js 18+ (20 or 22 LTS recommended; tested with Node 22)
- npm 10+
- A desktop browser with WebGL (Chrome, Edge, Firefox, Safari). Phaser falls back to Canvas if WebGL is unavailable.

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check and build the production bundle into dist/
npm run preview  # serve the production build locally
```

### Single-file version (no server needed)

```bash
npm run build:single   # -> release/mishkontin-v0.1.html
```

Produces **one self-contained HTML file** (~3.5 MB) with the code, Mishkontin's frames and
the icon embedded. Double-click it to play in a desktop browser; no server or other files
are needed. A prebuilt copy is committed at `release/mishkontin-v0.1.html`.

Other scripts:

| Script              | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `npm run typecheck` | TypeScript check only                                          |
| `npm run atlas`     | Regenerate Mishkontin's game frames from the source sprite sheet |
| `npm run build:single` | Build the single-file `release/mishkontin-v0.1.html`        |

`dist/` is static and can be hosted on any static web server. Asset paths are relative (`base: './'`).

## Controls

| Action        | Keys                         |
| ------------- | ---------------------------- |
| Move left     | `A` / `←`                    |
| Move right    | `D` / `→`                    |
| Jump          | `SPACE` (also `W` / `↑`)     |
| Crouch        | `S` / `↓`                    |
| Pause         | `ESC`                        |
| Debug overlay | `F3` or `` ` `` (backtick)   |
| Test HURT animation | `H` (only while the debug overlay is visible) |

Menus work with the mouse or with `↑`/`↓` + `ENTER`/`SPACE`.

Hold `SPACE` longer to jump higher. The controls are deliberately forgiving:

- **Coyote time (100 ms):** you can still jump just after running off a ledge.
- **Jump buffer (120 ms):** a jump pressed just before landing still happens.

## Project architecture

```
index.html                 page shell (#game container)
vite.config.ts             Vite config (+ strips source-only assets from dist/)
tools/
  build-mishkontin-atlas.mjs   sprite-sheet preprocessor (see below)
public/
  favicon.png
  assets/
    characters/mishkontin/
      mishkontin-gameplay-v1.png        supplied source artwork (not loaded by the game)
      generated/mishkontin-frames.png   uniform, foot-aligned frames (generated)
      generated/mishkontin-frames.json  frame size, foot anchor, sequences (generated)
    environments/  audio/  ui/          reserved for final art and audio
src/
  main.ts                  creates the Phaser game
  config/
    gameConfig.ts          Phaser config: 1280x720, FIT scaling, Arcade Physics
    constants.ts           ALL tuning values: movement, assists, body, camera, UI text...
  scenes/
    BootScene.ts           loads the frame manifest
    PreloadScene.ts        loads the frames, generates placeholder art, registers animations
    MainMenuScene.ts       title + ИГРАЙ / НАСТРОЙКИ
    SettingsScene.ts       debug info, fullscreen, reset progress
    ForestTestScene.ts     the test level; only wires systems together
    PauseScene.ts          pause overlay
  entities/
    Mishkontin.ts          player: movement, coyote time, jump buffer, variable jump, body
    PlayerStateMachine.ts  IDLE/RUN/JUMP/FALL/LAND/CROUCH/HURT with priorities
    IdleBehaviour.ts       idle personality (alternate idles after ~5 s, extensible)
    mishkontinAnimations.ts  animation definitions built from the frame manifest
  levels/
    LevelTypes.ts          data types for levels
    forestTestLevel.ts     ForestTest layout as pure data
    LevelBuilder.ts        turns level data into terrain, one-way platforms, props
    ParallaxBackground.ts  cheap screen-fixed parallax layers
  systems/
    InputSystem.ts         keyboard -> per-frame intent snapshot (no allocations)
    SaveSystem.ts          versioned localStorage save
    CameraController.ts    smooth follow, dead-zone, eased look-ahead
    CheckpointSystem.ts    reusable checkpoints (+ persistence)
    RespawnController.ts   fall detection, fade, respawn at last checkpoint
    DebugOverlay.ts        developer overlay
  ui/
    HUD.ts                 toasts, controls hint, finish sequence
    MenuList.ts            mouse + keyboard menu buttons
    menuBackdrop.ts        menu background
  utils/
    placeholderArt.ts      TEMPORARY environment art drawn on canvases
```

Design notes:

- **Scenes are thin.** Gameplay logic lives in entities and systems, and levels are data
  (`LevelDef`), so adding a level means adding a data file.
- **Gameplay clock.** `ForestTestScene` sums Phaser's (capped, smoothed) frame deltas into a
  simulation clock, the same time base Arcade Physics uses. Coyote time, the jump buffer and
  the hurt timer run on it, so they behave the same on slow or uneven frames.
- **No per-frame allocations** in the update path: the input snapshot and state-machine input
  objects are reused.

### Mishkontin's sprite sheet

The supplied sheet `mishkontin-gameplay-v1.png` (2000x667 RGBA, transparent background)
**is not a uniform grid**. Frames differ in width and height, rows aren't aligned, neighbouring
frames touch (tails and staffs overlap the next frame), and the sheet contains label pills and
frame numbers. Slicing it with fixed frame dimensions would cut off ears, tails and staffs.

`tools/build-mishkontin-atlas.mjs` (`npm run atlas`) preprocesses it without redrawing,
scaling or distorting anything:

1. Removes the label pills and caption digits.
2. Erodes the opaque mask to find one "body seed" per frame (45 frames: IDLE 6, RUN 9,
   JUMP 6, FALL 4, LAND 5, CROUCH 4, HURT 5, TURN 6) and checks the count per row.
3. Assigns every opaque pixel to a frame with an edge-aware flood fill (Dijkstra) from the
   seeds. Crossing a strong colour edge or a semi-transparent halo is expensive, so a staff
   tip touching a neighbour's ear stays with its own mouse.
4. Attaches detached pieces (e.g. the HURT "dizzy stars") to the nearest frame and drops
   compression noise.
5. Finds a **foot anchor** per frame and pastes every frame into a uniform 213x195 cell with
   all anchors on the same point.

Result: a regular spritesheet that Phaser loads with `load.spritesheet`. Feet are aligned
across frames, every frame shares one origin, and the physics body offset is the same for
all frames. Add `--preview out.png` to the tool command to write a colour-coded
frame-ownership image for checking.

### Collision body

The Arcade body covers **torso + legs only**. Ears, cloak, staff and tail are visual only.
Its bottom edge sits exactly on the feet (the sprite's `y` is the feet position). Tune it in
`src/config/constants.ts` → `PLAYER_BODY` (width, standing and crouch height, horizontal
offset), in unscaled frame pixels.

### Placeholder environment art

All environment graphics are **temporary** and drawn at startup in `src/utils/placeholderArt.ts`.
Every texture has a key in `PlaceholderTextures`. To swap in final art, load an image with the
same key in `PreloadScene`; generation is skipped for keys that already exist.

## Debug mode

Debug information is never shown in normal play. Enable it in any of these ways:

- press `F3` or `` ` `` during gameplay (toggles),
- turn on **НАСТРОЙКИ → Информация за разработчици** (persisted),
- open the game with `?debug` in the URL, e.g. `http://localhost:5173/?debug`.

The overlay shows FPS, player position, velocity, grounded state, state machine state,
current animation, facing, remaining coyote time and the active checkpoint. It also draws
the Arcade physics bodies and the checkpoint/respawn markers. While it is visible, `H`
plays the HURT reaction (v0.1 has no enemies).

In development builds the Phaser game instance is available in the browser console as
`window.__MISHKONTIN__`.

## Save data

`localStorage` key `mishkontin.save`, versioned:

```json
{
  "version": 1,
  "level": "forest-test",
  "checkpoint": "forest-test-cp1",
  "settings": { "debugMode": false },
  "virtues": {},
  "collectibles": {},
  "storyFlags": {}
}
```

Finishing the test level clears the checkpoint. **НАСТРОЙКИ → Изтрий запазения прогрес** resets
progress and keeps settings.

## Repository note

`deadly_forest_game_v0.6/` is an older, unrelated prototype that was already in the repository.
It is left untouched and is not part of this project's build.
