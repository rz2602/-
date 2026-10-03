import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/**
 * Files that live in public/ only as input for tools/ (never loaded by the
 * game). They are removed from dist/ so deployments stay small.
 */
const SOURCE_ONLY_ASSETS = ['assets/characters/mishkontin/mishkontin-gameplay-v1.png'];

function stripSourceOnlyAssets(): Plugin {
  return {
    name: 'strip-source-only-assets',
    apply: 'build',
    closeBundle() {
      for (const file of SOURCE_ONLY_ASSETS) {
        rmSync(fileURLToPath(new URL(`./dist/${file}`, import.meta.url)), { force: true });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // `--mode single` is used by tools/build-single-file.mjs: one JS chunk, no
  // public/ copy (assets get embedded into the HTML by that script instead).
  const single = mode === 'single';
  return {
    base: './',
    server: { port: 5173, open: false },
    plugins: single ? [] : [stripSourceOnlyAssets()],
    build: {
      target: 'es2022',
      outDir: single ? 'dist-single' : 'dist',
      copyPublicDir: !single,
      modulePreload: !single,
      // Phaser is ~1.5 MB minified; keep it in its own long-cacheable chunk.
      chunkSizeWarningLimit: single ? 4000 : 1600,
      rollupOptions: {
        output: single ? { inlineDynamicImports: true } : { manualChunks: { phaser: ['phaser'] } },
      },
    },
  };
});
