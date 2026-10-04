# Changelog

# v0.1.1 - Forest art pass

## Ultra Detail production art + official branding

- Production masters stored byte-identical in `art/masters/` with SHA-256 manifest. Runtime
  copies come from `tools/build-production-assets.mjs` (`npm run production-assets`): checksum
  verification, runtime-only alpha cleanup, size = max display × 2.4, lossless WebP for alpha
  art, q95 WebP for the opaque sky, PNG for brand assets.
- **Independent parallax layers** from the new masters: sky 0.05, mountains + Sirengrad 0.10,
  distant forest 0.20, mid forest 0.40. Image rows are sampled 1:1 with mirrored joins.
  Sirengrad appears once (castle-free extension joined on mountain peaks). All four are ≤125 %
  at 1440p.
- New trees (3 large oaks incl. the former `tree_medium_master`, pine, ancient tree) and a
  **static** high-resolution waterfall. Old scrolling waterfall overlay removed. World sizes are
  kept and placed by measured **normalized** ground-contact anchors.
- Legacy kit manifest gains `anchorsNormalized` (pixels unchanged).
- **Official wordmark** replaces the typed menu title; menu recomposed (wordmark → subtitle →
  ИГРАЙ → НАСТРОЙКИ → forest). **Emblem boot/loading screen** (~1.3 s, skippable once loaded).
  `src/ui/Brand.ts`; brand assets are screen-space UI only.
- Debug: art inspector (click), rendered size in the scale audit, render-scale line.
- Mishkontin: legacy animation atlas kept (no high-res animation exists; key poses conflict
  with the canonical staff design). Documented in `art/README.md`.
- Gameplay, physics, collision, camera, checkpoints and saves unchanged: 18/18 checks, bot run
  identical.

## High-resolution rendering pass

- **Real device-resolution canvas.** The backbuffer is no longer a fixed 1280x720 stretched by
  CSS. It is sized to the displayed device pixels (1920x1080 at 1080p, 2560x1440 at 1440p, up to
  3x on HiDPI/4K) and cameras zoom the unchanged logical 1280x720 view. It updates on window
  resize and monitor DPR changes.
- Camera follow, dead-zone, look-ahead, bounds and the finish pan are reimplemented in
  `CameraController` for the zoomed origin-(0,0) cameras. The feel is unchanged.
- Text rasterised at the render scale. The UI button texture is drawn at 3x.
- No extra resampling: tiled textures cut at power-of-two sizes, wide background strips drawn as
  1:1 image rows.
- Filtering verified LINEAR (`antialias`, `antialiasGL`, `pixelArt: false`, `roundPixels: false`).
- **Asset scale audit** (debug `R`) and `art/ASSET_RESOLUTION_REPORT.md`: all 54 kit-derived
  textures, and Mishkontin's frames, exceed 125% magnification at 1440p and are flagged for
  replacement. Nothing was upscaled or artificially sharpened. (No AI image generation was used,
  at the user's request.)
- Tested at 1920x1080, 2560x1440 and 1440x900 @2x: backbuffer equals device pixels, mouse
  input maps correctly, all gameplay checks pass.

## Forest art pass

Visual pass over ForestTestScene. Movement, physics, assists, collision body, camera feel,
checkpoints, saving and debug mode are unchanged (all v0.1 checks still pass).

### Art pipeline
- References stored in `art/` (not shipped): Forest Art Direction (reference only) and the
  Forest Environment Kit sheet.
- `tools/extract-forest-kit.mjs` (`npm run forest-kit`): 66 pieces cut by connected
  components, touching objects split by seeded edge-aware flood fill, label pills removed,
  strips mirror-tiled and feathered, anchors exported to `forest-assets.json`.
- The Mickey-Mouse-head symbol on the kit's sign and waystone is clone-stamped out; the banner
  is not used.
- Assets organised under `public/assets/environments/forest/{background,terrain,trees,plants,rocks,props,water,foreground}`.
- All kit-derived art is marked TEMPORARY (low resolution).

### Rendering
- 8 explicit visual layers with parallax: sky 0.04, mountains + Sirengrad 0.10, distant forest
  0.20, mid forest 0.40, back decoration 0.85, terrain 1.0, gameplay 1.0, foreground 1.12.
- Modular terrain over unchanged simple collision: grass cap with its walk line on the
  collision top, rounded ends, synthesised non-repeating soil, depth and side shading, ravine
  walls in gaps.
- One-way platforms drawn as grassy slabs. New rope bridge (flat, predictable collision).
- Animated river below the level (visible in every gap), animated waterfalls with foam,
  splash particles.
- Lighting: bright sky gradient, warm sun wash, soft sun shafts, atmospheric haze, cooler
  distant layers, light shafts on the checkpoint and the viewpoint, glowing lanterns.
- Sirengrad on the distant mountains, framed to appear at the final viewpoint.
- Sparse foreground leaves at the bottom screen edges.
- Menu backdrop uses the same forest layers.

### Level composition
- Areas: A forest entrance, B stream gap, C vertical platforms with a waterfall, E checkpoint
  clearing, D rope bridge over the river, F final viewpoint cliff (new climb at the end).
- Water acts as a respawn zone: splash, quick fade, back to the checkpoint.

### Checkpoint
- Magical forest waystone: idle low glow and motes; on activation a golden paw glyph, bright
  glow and spark burst. `GameEvents.CheckpointActivated` / `WaterSplash` sound hooks.
- `CheckpointSystem` takes a visual factory, so it stays level-agnostic.

### Camera
- At the finish the camera glides up to open the view toward Sirengrad.

### Debug
- Second debug panel: current area plus every layer with its scroll factors.
- `L` (debug only) shows one visual layer at a time.

### Fixes
- A visual tween can no longer leave Mishkontin invisible after a respawn.

# v0.1

First playable prototype: movement, animation and camera on one test level.

### Project
- Phaser 3 + TypeScript + Vite project (`npm run dev`, `npm run build`, `npm run preview`).
- 1280x720 base resolution with responsive FIT scaling (16:9 kept, letterboxed).
- Modular structure: config / scenes / entities / systems / levels / ui / utils.
- All tuning values in `src/config/constants.ts`.

### Mishkontin artwork pipeline
- Analysed the supplied `mishkontin-gameplay-v1.png` (2000x667, transparent). It is not a
  uniform grid.
- `tools/build-mishkontin-atlas.mjs` (`npm run atlas`) separates the 45 frames by pixel
  ownership (seed erosion + edge-aware flood fill), removes labels and frame numbers, keeps
  ears, tails, staffs and hurt stars intact, and packs the frames into a uniform,
  foot-aligned 213x195 grid with a JSON manifest.
- The artwork itself is unchanged: no redrawing, rescaling or distortion.

### Player
- Arcade Physics movement: max speed 230 px/s, acceleration 1200, ground drag 1500 (air drag
  500), gravity 1100, jump velocity -480, max fall speed 900.
- Quicker turnarounds (extra acceleration when reversing direction).
- Variable jump height (releasing jump early cuts the rise).
- Coyote time 100 ms and jump buffer 120 ms, on a gameplay clock so they also hold on slow frames.
- Crouch (smaller collision body, no movement while crouched; facing can still change).
- Facing direction via sprite flip around the shared foot anchor.
- Collision body on torso + legs only (ears, cloak, staff, tail excluded), bottom on the feet,
  dimensions/offsets exposed as constants.
- Animation state machine: IDLE, RUN, JUMP, FALL, LAND, CROUCH, HURT with priority
  HURT > LAND > JUMP/FALL > CROUCH > RUN > IDLE. Animations only change on state changes.
  The run cadence scales with speed, and LAND can be cut short by moving or crouching.
- Idle personality: plain idle loop, then blink/wink alternates after ~5 s of inactivity.
  New idle variants are added as data entries.
- HURT reaction with gentle knockback (debug-triggered, since there are no enemies yet).

### Level: ForestTestScene
- Movement test course, ~13,300 px wide: start meadow with practice platforms, small gaps,
  a platform climb onto a plateau, a checkpoint meadow, a gap series, one larger jump over
  a pit with a safe floor, an optional lookout climb, log hops over a safe hollow, a ridge
  climb with terrace steps down, and the finish.
- Terrain at several heights. One-way platforms can be jumped through from below.
- Completed by a scripted test bot with no respawns in 56 s of perfect input. Casual play
  is expected to take about 2–3 minutes.
- Temporary placeholder environment art (canvas-generated, easy to replace), parallax
  background.

### Camera
- Smooth follow with a modest dead-zone, eased look-ahead in the facing direction, and a
  slight vertical bias. Bounded to the level, with no screen shake.

### Checkpoint, respawn and save
- Reusable `CheckpointSystem` (one lantern checkpoint in this level) with a "Чекпойнт!" toast.
- Falling out of the level: short fade, respawn at the last checkpoint, "Хайде още веднъж!".
  There is no death screen and no progress loss.
- `SaveSystem` with versioned localStorage data (level, checkpoint, settings; empty
  virtues/collectibles/storyFlags reserved). The level resumes at the saved checkpoint.

### Menus and UI
- Main menu: "МИШКОНТИН / и кралят плъх Мортис", ИГРАЙ, НАСТРОЙКИ (mouse + keyboard).
- Settings: developer info toggle, fullscreen, reset progress.
- Pause overlay (ESC): ПРОДЪЛЖИ / ГЛАВНО МЕНЮ.
- Short controls hint at level start.
- Finish sequence: controls disabled, scene dims, "Приключението тепърва започва...",
  "Мишконтин — v0.1", then ENTER/click returns to the main menu.

### Debug
- Toggleable overlay (F3 / backtick / settings / `?debug`): FPS, position, velocity, grounded,
  state, animation, facing, coyote time, checkpoint, physics bodies, checkpoint markers.

### Build
- Phaser in a separate cacheable chunk. The raw source sprite sheet is excluded from `dist/`.
- `npm run build:single`: one self-contained HTML file (`release/mishkontin-v0.1.html`) that
  runs when opened directly from disk.
