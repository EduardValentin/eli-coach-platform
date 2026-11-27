import eliPortraitSmallPath from "./media/eli-portrait-192.webp?url&no-inline";
import eliPortraitLargePath from "./media/eli-portrait-448.webp?url&no-inline";

// Kept out of index.ts: the Playwright specs import that module, and Playwright,
// unlike Vite, cannot resolve an asset import.
export const ELI_PORTRAIT_PATHS = {
  large: eliPortraitLargePath,
  small: eliPortraitSmallPath,
} as const;
