# Art sources (not shipped)

Files here are **inputs** for the tools in `tools/`. The game never loads them, and they are
outside `public/`, so they never reach `dist/`.

| File | What it is | Used by |
|------|------------|---------|
| `reference/forest-art-direction-v1.webp` | Forest Art Direction v1.0, the primary visual target (composition, light, colour). One flat painting, **reference only**. | humans |
| `source/forest-environment-kit-v1.png` | Forest Environment Kit v1.0 (1125x750, transparent background), lossless PNG of the supplied WebP | `tools/extract-forest-kit.mjs` |

## Status of the forest pieces

Everything under `public/assets/environments/forest/` is **temporary, reference-derived art**,
cut from the kit sheet at its native low resolution and scaled up 1.3-3x in game.

To replace a piece with final art:

1. Export it at roughly 2-3x the current pixel size, same proportions and transparent background.
2. Overwrite the PNG with the same name (or point `forest-assets.json` at the new file).
3. Keep the **anchors** in `forest-assets.json` correct (grass walk line, bridge deck, lantern
   light, waystone glyph, waterfall columns). They are in texture pixels.
4. Adjust display scales in `src/levels/forest/DecorationPlacer.ts` / `TerrainRenderer.ts`.

Final art should be produced at the target resolution instead of re-running the extractor.

## IP note

The kit's wooden sign, waystone and banner carry a **Mickey-Mouse-head symbol**, which is a
third-party trademark. The extractor clone-stamps it out of the sign and the waystone, and
the banner is not extracted. Final art must not reintroduce it. The waystone's symbol in
game is a golden mouse-paw glyph drawn in `src/levels/forest/forestFx.ts`.
