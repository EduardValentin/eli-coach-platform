const port = process.env.PORT ?? "3000";
const path = process.env.HEALTHCHECK_PATH ?? readinessPathUnderBasePath();
const url = new URL(path, `http://127.0.0.1:${port}`);

function readinessPathUnderBasePath() {
  const basePath = (process.env.APP_BASE_PATH ?? "/").replace(/\/+$/, "");

  return `${basePath}/readyz`;
}

try {
  const response = await fetch(url);
  if (!response.ok) {
    process.exit(1);
  }
} catch {
  process.exit(1);
}
