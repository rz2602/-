import { defineConfig } from 'vite';

// The Heroes-style concept lives in game/ and ships only public-heroes/.
// The original platformer prototype (src/, tools/, public/, release/) is kept
// untouched for reference; its canonical home is the `Mishkontin` branch.
export default defineConfig({
  base: './',
  publicDir: 'public-heroes',
  server: { port: 5173, open: false },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
