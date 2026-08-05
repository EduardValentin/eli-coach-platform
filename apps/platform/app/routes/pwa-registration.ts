import { joinBasePath } from "@eli-coach-platform/config";

type PwaSurface = "client" | "coach";

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
