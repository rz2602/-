/**
 * Resolves an asset path to what the Phaser loader should load.
 *
 * Normally that is the path itself. The single-file build
 * (tools/build-single-file.mjs) embeds assets into the HTML page as
 * `window.__MISHKONTIN_INLINE_ASSETS__` (data URIs for images, parsed objects
 * for JSON), so the game also works when opened directly from disk.
 */
declare global {
  interface Window {
    __MISHKONTIN_INLINE_ASSETS__?: Record<string, string | object>;
  }
}

export function assetSource(path: string): string {
  return (window.__MISHKONTIN_INLINE_ASSETS__?.[path] as string | undefined) ?? path;
}

/** JSON variant: Phaser accepts either a URL or the already-parsed object. */
export function jsonAssetSource(path: string): string | object {
  return window.__MISHKONTIN_INLINE_ASSETS__?.[path] ?? path;
}
