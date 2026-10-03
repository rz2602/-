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

export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  plugins: [stripSourceOnlyAssets()],
  build: {
    target: 'es2022',
    // Phaser is ~1.5 MB minified; keep it in its own long-cacheable chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
});
