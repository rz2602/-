# Mishkontin V2 — high-resolution animation set: integration report

## 1. Result
**SUCCESS.** V2 is the gameplay character (`USE_MISHKONTIN_V2 = true`). The legacy atlas stays
loaded and recoverable.

## 2. Baseline
`6f25311` on `Mishkontin`, clean working tree.

## 3. Source files
`mishkontin_v2.zip` → `art/masters/characters/mishkontin_v2/`, byte-identical copies, with
SHA-256 in `art/masters/MANIFEST.json`. One master per animation, so no file was ambiguous.
Only file names were cleaned:
- `..png` → `.png`
- frame counts corrected in three names: run 6 → 8, crouch 6 → 4, wave 4 → 6

## 4. Alpha audit (pixel level)

| Sheet | Size | α = 0 | Corners | Checkerboard / white / black matte | Halo | Frames (by inspection) | Status |
|---|---|---|---|---|---|---|---|
| idle | 2172×724 | 51.7 % | 0,0,0,0 | none | none | 6 | ACCEPT |
| run | 2172×724 | 67.3 % | 0,0,0,0 | none | none | **8** (name said 6) | ACCEPT |
| jump | 2172×724 | 66.1 % | 0,0,0,0 | none | none | 6 | ACCEPT |
| fall | 2172×724 | 67.9 % | 0,0,0,0 | none | none | 6 | ACCEPT |
| land | 2161×728 | 72.9 % | 0,0,0,0 | none | none | 6 | ACCEPT |
| crouch | 2172×724 | 60.5 % | 0,0,0,0 | none | none | **4** (name said 6) | ACCEPT |
| hurt | 2172×724 | 65.9 % | 0,0,0,0 | none | none | 5 | ACCEPT |
| turn | 2172×724 | 59.1 % | 0,0,0,0 | none | none | 6 | ACCEPT |
| blink | 2171×724 | 49.2 % | 0,0,0,0 | none | none | 4 | ACCEPT |
| wave | 2172×724 | 56.1 % | 0,0,0,0 | none | none | **6** (name said 4) | ACCEPT |
| surprised | 2172×724 | 46.2 % | 0,0,0,0 | none | none | 4 | ACCEPT |
| read_map | 2172×724 | 48.3 % | 0,0,0,0 | none | none | 6 | ACCEPT |
| sit | 2172×724 | 54.2 % | 0,0,0,0 | none | none | 6 | ACCEPT (see §9) |
| sleep | 2172×724 | 62.4 % | 0,0,0,0 | none | 0.4 % dark semi-transparent pixels (soft shadow) | 4 | ACCEPT |
| reference / character master | 1536×1024 | 29.7 % | 0,0,0,0 | none | none | — | reference only |

- All sheets are RGBA with real alpha. Almost every visible pixel is alpha 254, which is fixed to
  255 on the runtime copy only.
- No sheet touches its canvas edge, so nothing is clipped.

## 5. Character consistency

| Animation | Class | Notes |
|---|---|---|
| idle, run, jump, fall, land, crouch, turn | A | Canonical: cream belly, pink ears and tail, green cloak, gold medallion, satchel, belt, plain wooden staff (no orb or leaves). |
| hurt | B | Drawn larger. The ear proxy under-reads it (corrected ×0.86). The comic stars and marks belong to the frame. |
| blink, wave, surprised, read_map | B | A little more saturated orange than the core set. |
| sit, sleep | B | Same orange shift. Drawn larger (corrected ×0.92 / ×0.75). Sit has no map or staff, as intended. |
| turn frame 2 | B | Back view: the satchel strap and medallion are naturally hidden. |

No C/D animations. Nothing was repainted.

## 6. Slicing
- **Frame boundaries** are minimum-cost vertical seams through the transparent space between
  poses, found by dynamic programming. They are not equal cells: the sheets are irregular and
  some poses overlap.
- **Detached parts** stay with the frame whose region they are in: sleep's Z symbols, the
  surprise and hurt marks, the map and the staff.
- **Opaque pixels crossed by a seam:** 0 in 11 sheets; run 0–15; jump 16 (one seam); read_map
  48 and 10; sit 49–93 per seam. In sit the poses physically touch (a toe of one frame against
  the tail of the next), so a few toe or tail-tip pixels are cut. Not visible at gameplay size.
- **Determinism:** same masters → same atlas (`tools/build-mishkontin-v2.mjs`).

## 7. Normalization, anchors, scale
- **One character scale.** The sheets were drawn at different sizes, so each sheet gets one
  factor: idle ear size ÷ that sheet's ear size (median of the pink ear area in the upper half
  of each frame). Manual corrections where the pose foreshortens the ears: hurt ×0.86, sit ×0.92,
  sleep ×0.75. Frames are never scaled individually, never stretched and never upscaled
  (all factors are 0.37–0.85).
- **Anchors.**
  - Grounded frames: the feet (lowest row with real coverage), with x at the fur centroid.
  - Airborne frames (jump 1–4, fall 0–2, land 0–2): the fur centroid, held at the same height
    above the physics feet as in idle.
  - All frames share one cell (375×368 runtime px, anchor at 213,351), so the Phaser origin is
    constant and nothing pops.
- **Size.** Idle is 150 logical px tall with ears and staff (legacy: about 129). Runtime is 2 px per
  logical px: **100 % at 1440p, 150 % at 4K** (legacy: 170 % at 1440p).

## 8. Runtime atlas
`public/assets/characters/mishkontin/v2/`:
- `mishkontin-v2.webp`: one **4044×1674** page, 77 trimmed frames, lossless WebP verified
  identical on visible pixels, 6.1 MB.
- `mishkontin-v2.json`: Phaser atlas.
- `mishkontin-v2-manifest.json`: anchor, cell, scale, frame names.

A single page keeps one texture bind and needs no multi-atlas handling in the single-file build.
Source record: `art/masters/characters/mishkontin_v2/CHARACTER_V2_MANIFEST.json`.

## 9. Animations

| Animation | Frames (sheet indices) | FPS | Loop | Interruptible |
|---|---|---|---|---|
| idle | idle 0–5 | 5 | yes | always |
| idle-blink (idle variant) | blink 0,1,2,1,3 | 10 | once | always |
| run | run 0–7 | 12 (× speed ratio, 0.55–1, as before) | yes | always |
| jump | jump 1–3 (0 is ground anticipation; take-off is instant) | 10 | once | physics decides fall |
| fall | fall 0,1,2,1 | 8 | yes | on landing |
| land | land 3–5 (squash → recover) | 14 | once | by input after 90 ms (unchanged) |
| crouch / crouch-hold | crouch 1–3 / 3 | 16 / hold | once / hold | release |
| hurt | hurt 0–4 | 8 | once | existing hurt timer |
| turn | turn 0–5 | 12 | once | registered, **not auto-triggered** (as in legacy). The sheet is a 180° turn through a back view; driving it from input would delay direction changes. Callable later. |
| wave | wave 0,1,2,3,2,3,4,5 | 8 | once → idle | any input |
| surprised | surprised 0,1,2,2,3 | 7 | once → idle | any input |
| read_map | read_map 0–5 | 3 | yes | any input |
| sit | sit 0–5 | 3 | yes | any input |
| sleep | sleep 0–1, then 2–3 loop (Z) | 2 / 1.5 | settle → loop | any input |

**Personality API.** `player.playPersonality('wave' | 'surprised' | 'readMap' | 'sit' | 'sleep' | 'blink')`
- It is allowed only while idle.
- Movement, jump, crouch, fall or hurt ends it immediately.
- Nothing triggers it in the Forest level. Only blink plays automatically: after 5 s idle, then every
  3–7 s (`IDLE_BEHAVIOUR`).

**Developer lab.** `?animlab` shows every V2 animation at gameplay scale, with the foot anchor and the
collision body. F flips, SPACE pauses, 1–9 change speed. It is not reachable from the menus.

## 10. Physics and collision
The body is defined in legacy frame px and converted for V2 (×PLAYER_SCALE / V2 scale = ×1.7). In game
it is bit-identical in both modes:
- 39.1 × 73.1 logical px
- offset −17.85 / −73.1 from the feet
- crouch 51 px high

Ears, cloak, staff and tail never collide. Movement constants are unchanged. The bot run is
identical (54.7 s, 0 respawns).

## 11. Resolution QA
At 1280×720, 1920×1080, 2560×1440 and 1440×900 @2× (2880×1620):
- Backbuffer equals device pixels, parallax factors are exact, Sirengrad appears once and camera
  bounds are 0…12040.
- Feet sit on the ground and there are no console errors.
- The character is drawn at 100 % at 1440p.

## 12. Regression
- Mechanics: **18/18** at 1280×720 and **18/18** at 1920×1080.
- Real-keyboard smoke test: pass.
- Bot: **54.7 s, 0 respawns**.
- Main Menu: pixel-identical at 720p, 1440p and HiDPI (it keeps the legacy sprite, as locked).

**Test change (documented).** The "alternate idle (blink/wink) after ~5 s" check matched the literal
legacy key `mishkontin-idle-blink`. V2 keys are prefixed `mishkontin2-` so the menu's legacy
animations stay untouched, and the check now accepts either prefix. Same behaviour verified.

## 13. Performance

| | Before | After |
|---|---|---|
| Character textures | 1 (legacy 1917×975 PNG, 1.5 MB, ~7 MB decoded) | 2 (legacy for the menu + V2 4044×1674 WebP, 6.1 MB, ~27 MB decoded) |
| Frame rate (swiftshader, end of level) | 4.5–4.75 fps | 4.5 fps (same within noise) |

## 14. Remaining visual debt
- Personality sheets are slightly more saturated orange than the core set (class B).
- Sit loses a few toe or tail-tip pixels at the seams (the source poses overlap).
- Turn is not auto-triggered (a deliberate controls-first choice).
- The Main Menu still shows the legacy Mishkontin (locked).
