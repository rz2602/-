# Мишконтин и кралят плъх Мортис

*Mishkontin and King Mortis the Rat*: a browser-based 2D action-adventure platformer for children.

**Current version: v0.1.1**, a movement, animation and camera prototype with one test level
(`ForestTestScene`), now with a first storybook-forest art pass. See [CHANGELOG.md](CHANGELOG.md) for what is included and
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
npm run build:single   # -> release/mishkontin-v0.1.1.html
```

Produces **one self-contained HTML file** (~25 MB with the high-resolution art) with the code, Mishkontin's frames, the
forest art and the icon embedded. Double-click it to play in a desktop browser; no server or
other files are needed. A prebuilt copy is committed at `release/mishkontin-v0.1.1.html`.

Other scripts:

| Script              | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `npm run typecheck` | TypeScript check only                                          |
| `npm run atlas`     | Regenerate Mishkontin's game frames from the source sprite sheet |
| `npm run production-assets` | Build runtime copies of the production masters (`art/masters/`) |
| `npm run forest-kit` | Re-extract the legacy forest pieces from the kit sheet         |
| `npm run build:single` | Build the single-file `release/mishkontin-v0.1.1.html`      |

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
| Solo one visual layer | `L` (only while the debug overlay is visible) |
| Asset resolution audit | `R` (only while the debug overlay is visible; console table) |

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
  extract-forest-kit.mjs       forest environment kit extractor (see below)
  build-single-file.mjs        single-file HTML build
art/                       source/reference art, NOT shipped (see art/README.md)
  source/forest-environment-kit-v1.png
  reference/forest-art-direction-v1.webp
release/                   prebuilt single-file game
public/
  favicon.png
  assets/
    characters/mishkontin/
      mishkontin-gameplay-v1.png        supplied source artwork (not loaded by the game)
      generated/mishkontin-frames.png   uniform, foot-aligned frames (generated)
      generated/mishkontin-frames.json  frame size, foot anchor, sequences (generated)
    environments/forest/                generated forest pieces (temporary, reference-derived)
      forest-assets.json                manifest: key -> path, size, anchors
      background/ terrain/ trees/ plants/ rocks/ props/ water/ foreground/
    audio/  ui/                         reserved for final art and audio
src/
  main.ts                  creates the Phaser game
  config/
    gameConfig.ts          Phaser config: 1280x720, FIT scaling, Arcade Physics
    constants.ts           ALL tuning values: movement, assists, body, camera, UI text...
  scenes/
    BootScene.ts           loads the frame and forest manifests
    PreloadScene.ts        loads frames + forest art, generates FX textures, registers animations
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
    LevelBuilder.ts        simple collision bodies + delegates all artwork to forest/
    forest/
      forestLayers.ts      the 8 visual layers: depth + scroll factors (single source of truth)
      forestAssets.ts      forest manifest access (keys, sizes, anchors)
      forestFx.ts          procedural FX textures: sky, haze, light, glow, sparks, menu soil
      ForestBackdrop.ts    layers 0-3: sky, mountains + Sirengrad, distant + mid forest, light
      TerrainRenderer.ts   kit ground strip / cliff columns / pillars / ravine walls over plain rectangles; platforms; bridge
      DecorationPlacer.ts  back / ground / foreground decorations (+ parallax placement), scatter
      ForestWater.ts       waterfalls; optional river band + splashes (RIVER_VISIBLE)
      WaystoneVisual.ts    the checkpoint waystone (production art; its carved rune lights up)
  systems/
    RenderScale.ts         device-resolution backbuffer + camera zoom + crisp text
    AssetScaleAudit.ts     measures on-screen magnification of every texture
    InputSystem.ts         keyboard -> per-frame intent snapshot (no allocations)
    SaveSystem.ts          versioned localStorage save
    CameraController.ts    smooth follow, dead-zone, eased look-ahead
    CheckpointSystem.ts    reusable checkpoints (+ persistence)
    RespawnController.ts   fall detection, fade, respawn at last checkpoint
    DebugOverlay.ts        developer overlay
  ui/
    HUD.ts                 toasts, controls hint, finish sequence
    MenuList.ts            mouse + keyboard menu buttons
    menuBackdrop.ts        menu background (same forest layers)
  utils/
    assetSource.ts         resolves asset paths (inline data in the single-file build)
    placeholderArt.ts      TEMPORARY menu button texture
```

Design notes:

- **High-resolution rendering.** Logic and layout use a fixed *logical* 1280x720, but the canvas
  backbuffer matches the real device pixels (CSS size x devicePixelRatio, up to 3x: 1920x1080 at
  1080p, 2560x1440 at 1440p). Every camera is zoomed by that render scale (`src/systems/RenderScale.ts`),
  so the browser never stretches a small canvas. Text is rasterised at the render scale. Cameras
  use origin (0, 0); `CameraController` does the follow (dead-zone, lerp, look-ahead, bounds).
  Filtering is LINEAR (`antialias: true`, `pixelArt: false`, `roundPixels: false`).
- **One resampling step.** Tiled textures are power-of-two sized (otherwise Phaser stretches them
  to POT first), and wide background strips are rows of images sampled 1:1.

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

### Production art & branding (v0.1.1 Ultra Detail pass)

High-resolution masters live in `art/masters/` (never edited, SHA-256 in `MANIFEST.json`).
`npm run production-assets` creates the runtime copies listed in
`public/assets/production-assets.json` (normalized anchors, world size in logical px).

- **Parallax:** sky 0.05 → mountains 0.10 → **Sirengrad 0.10 (a single world element)** →
  distant forest 0.20 → mid forest 0.40 → gameplay 1.0 → foreground 1.12. In gameplay the
  mountains are drawn from their castle-free part only and Sirengrad (`bg_sirengrad`) appears
  exactly once, at the final viewpoint. Layers repeat as plain overlapping copies (no mirroring);
  see `art/WIDE_BACKGROUND_INTEGRATION_REPORT.md`. The locked Main Menu keeps its original layers.
- **Trees & waterfall:** three large oaks, a pine, an ancient tree and a static waterfall, all
  decorative (no collision).
- **Branding (screen-space UI, `src/ui/Brand.ts`):** the official wordmark is the Main Menu title.
  The official emblem is shown on the boot/loading screen. Both are image-only, never
  re-typed, with aspect ratio preserved.
- **Forest Environment Asset Kit:** high-resolution ground strip, cliffs, platforms (by width),
  rope bridge, rocks, vegetation, props and sparse foreground framing. Every piece is positioned
  from the unchanged collision rectangles. All supplied PNGs pass a pixel-level alpha audit;
  ground ends, a high-resolution underground fill and the checkpoint waystone complete it. See
  `art/FOREST_ASSET_INTEGRATION_REPORT.md`.
- **Mishkontin V2:** a high-resolution animation set (`npm run mishkontin-v2`, one atlas, 100 % at
  1440p) with core animations and personality animations (`player.playPersonality('wave')` etc.;
  input always interrupts). Collision body and movement are unchanged. `USE_MISHKONTIN_V2` in
  `src/config/constants.ts` switches back to the legacy atlas, which the locked Main Menu still
  uses. Developer animation lab: open the game with `?animlab`. See
  `art/MISHKONTIN_V2_INTEGRATION_REPORT.md`. Motion tuning (run cadence, apex, landing, render
  interpolation) lives in `CHARACTER_MOTION`; see `art/MISHKONTIN_V2_MOVEMENT_POLISH_REPORT.md`.

Reports: `art/FOREST_ASSET_INTEGRATION_REPORT.md`, `art/INTEGRATION_REPORT_v0.1.1.md`, `art/ASSET_RESOLUTION_REPORT.md`, `art/README.md`.
Future art specs (legacy replacements, seamless background masters, Mishkontin animation
milestone): `art/FUTURE_ART_REQUIREMENTS.md`.

**Visual tuning** (`src/config/constants.ts`): `BACKGROUND_GRADING` (per-layer saturation /
contrast / brightness, no blur), `SUN_SHAFTS` (gameplay 0.22, menu 0.55), `RIVER_VISIBLE`
(river band below the gaps, off).

### Legacy forest kit art (v0.1.1 first art pass — now largely superseded by the Environment Asset Kit)

The forest follows two references in `art/`: the **Forest Art Direction** painting (composition,
light and colour target; reference only, since it is one flat image) and the **Forest Environment
Kit** sheet (transparent background, labelled groups of pieces).

`tools/extract-forest-kit.mjs` (`npm run forest-kit`) cuts the kit into 66 pieces by connected
components, not rectangles. Neighbouring objects, labels and specks never leak in, and touching
objects (tree crowns, shared grass bases) are split by an edge-aware flood fill from seed
points. Background strips are cropped clear of their labels, mirror-tiled for seamless
repetition and feathered so the layers blend. The manifest stores sizes and **anchors** (grass
walk line, bridge deck, lantern light, waystone glyph, waterfall columns) so code can line art
up with physics and effects. Add `--preview out.png` for a contact sheet.

> **IP note.** The kit's wooden sign, waystone and banner carry a Mickey-Mouse-head symbol (a
> third-party trademark). The tool clone-stamps it out of the sign and waystone, and the banner
> is not used. (The checkpoint now uses the production `prop_waystone_master`.)

**All kit-derived pieces are TEMPORARY.** The sheet is only 1125x750, so pieces are magnified
on screen far beyond the 125% limit (up to about 640% at 1440p) and look soft. They are
**flagged for replacement, not upscaled**. **[art/ASSET_RESOLUTION_REPORT.md](art/ASSET_RESOLUTION_REPORT.md)**
lists every texture with its measured magnification and the source size needed for 1440p and
4K. Final art replaces the PNGs under the same keys; see `art/README.md`.

**Visual layers** (back to front, defined in `src/levels/forest/forestLayers.ts`):

| # | Layer | Scroll X / Y | Content |
|---|-------|--------------|---------|
| 0 | Sky | 0.04 / 0.02 | gradient + clouds |
| 1 | Mountains | 0.10 / 0.05 | mountains, Sirengrad (in view only at the final viewpoint), haze |
| 2 | Distant forest | 0.20 / 0.10 | pines in haze, sun shafts |
| 3 | Mid forest | 0.40 / 0.20 | canopy + dark understory |
| 4 | Back decoration | 0.85 / 0.85 | big trees, waterfalls (ravine walls just in front) |
| 5 | Terrain | 1.0 | ravine rock walls, ground strip, cliff columns, platforms, bridge |
| 6 | Mishkontin + objects | 1.0 | ground props (behind him), waystone, effects |
| 7 | Foreground | 1.12 / 1.0 | sparse framing at the screen edges (never over Mishkontin or routes) |

Tiled layers are screen-sized TileSprites whose texture offset follows the camera, so each
costs one quad regardless of level length. Back and foreground decorations use Phaser scroll
factors and are positioned for the camera the player will have near them, so they appear where
the level data puts them.

**Readability rules:** the collision is plain rectangles (visual shape is not physics shape),
the ground strip's and platforms' grass surface sits exactly on the collision top, decorations never collide and
always draw behind Mishkontin, foreground pieces stay below the ground line, and falling into
a gap respawns (below the water line, with the usual "Хайде още веднъж!").

## Debug mode

Debug information is never shown in normal play. Enable it in any of these ways:

- press `F3` or `` ` `` during gameplay (toggles),
- turn on **НАСТРОЙКИ → Информация за разработчици** (persisted),
- open the game with `?debug` in the URL, e.g. `http://localhost:5173/?debug`.

The overlay shows FPS, player position, velocity, grounded state, state machine state,
current animation, facing, remaining coyote time and the active checkpoint. It also draws
the Arcade physics bodies and the checkpoint/respawn markers. A second panel lists the
current composition area (A-F) and all visual layers with their scroll factors.

While it is visible, `H` plays the HURT reaction (there are no enemies yet), `L` cycles
**layer solo** (only one visual layer is shown at a time, then all again), a mouse **click**
opens the art inspector for the object under the pointer (texture, native/rendered size,
scale %, normalized anchor, world position, scroll factor, physics body), and `R` runs the
**asset resolution audit**. The audit logs every raster texture's on-screen magnification and the
source size needed (see `art/ASSET_RESOLUTION_REPORT.md`). The panel also shows the current render
scale and backbuffer size, plus how many textures are above 125% right now.

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
