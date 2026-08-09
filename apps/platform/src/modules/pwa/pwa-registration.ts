import { joinBasePath } from "@eli-coach-platform/config";
import { pwaSurfaceDefinitions } from "@eli-coach-platform/domain";

type PwaSurface = keyof typeof pwaSurfaceDefinitions;

export function createPwaRegistration(options: {
  assetBasePath: string;
  surface: PwaSurface;
}) {
  const scope = joinBasePath(
    options.assetBasePath,
    `${options.surface}/`,
  );
  const serviceWorkerPath = joinBasePath(
    options.assetBasePath,
    `${options.surface}/sw.js`,
  );

  return {
    manifestPath: joinBasePath(
      options.assetBasePath,
      `${options.surface}/manifest.webmanifest`,
    ),
    registrationScript: `if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("${serviceWorkerPath}", { scope: "${scope}" }); }); }`,
  };
}
