const port = process.env.PORT ?? "3000";
const path =
  process.env.APP_HEALTHCHECK_PATH ?? process.env.HEALTHCHECK_PATH ?? "/";
const url = new URL(path, `http://127.0.0.1:${port}`);

try {
  const response = await fetch(url);
  if (!response.ok) {
    process.exit(1);
  }
} catch {
  process.exit(1);
}
