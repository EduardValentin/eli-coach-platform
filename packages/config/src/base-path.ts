export function normalizeBasePath(basePath: string): string {
  if (basePath === "/") {
    return "/";
  }

  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
}

export function joinBasePath(basePath: string, targetPath: string): string {
  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedTargetPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;

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
export function buildRedirectPath(basePath: string, targetPath: string): string {
  return joinBasePath(basePath, targetPath);
}
