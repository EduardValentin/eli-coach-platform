const APP_BASE_PATH_ATTRIBUTE = "data-app-base-path";

let serverAppBasePath = "/";

export function normalizeBasePath(basePath: string): string {
  if (basePath === "/") {
    return "/";
  }

  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
}

export function joinBasePath(basePath: string, targetPath: string): string {
  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedTargetPath = targetPath.startsWith("/")
    ? targetPath
    : `/${targetPath}`;

  if (normalizedBasePath === "/") {
    return normalizedTargetPath;
  }

  return `${normalizedBasePath}${normalizedTargetPath}`;
}

/**
 * Builds an app-internal redirect target with the app base path prepended.
 *
 * React Router prefixes the router basename onto redirects thrown from
 * loaders and actions, but NOT onto redirects thrown from middleware or
 * onto URLs handed to third-party SDKs (e.g. Clerk redirect props). Any
 * redirect target built outside a loader/action must go through this
 * helper, or it will escape the base path on deployments served under one
 * (TEST serves under /eli-coach-platform).
 */
export function buildRedirectPath(
  basePath: string,
  targetPath: string,
): string {
  return joinBasePath(basePath, targetPath);
}

/**
 * Set once by the server build entry when the instance starts. Route modules
 * evaluate before that entry's body runs, so callers read the prefix when they
 * build a URL, never into a module-level constant.
 */
export function registerAppBasePath(basePath: string): void {
  serverAppBasePath = normalizeBasePath(basePath);
}

/**
 * The prefix this instance is served under: the server knows it from its
 * runtime environment, the browser reads what the server wrote on `<html>`.
 */
export function appBasePath(): string {
  if (typeof document === "undefined") {
    return serverAppBasePath;
  }

  return document.documentElement.getAttribute(APP_BASE_PATH_ATTRIBUTE) ?? "/";
}

export function appBasePathDocumentAttribute(): Record<string, string> {
  return { [APP_BASE_PATH_ATTRIBUTE]: appBasePath() };
}

export function appUrl(targetPath: string): string {
  return joinBasePath(appBasePath(), targetPath);
}
