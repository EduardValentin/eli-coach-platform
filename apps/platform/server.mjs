import path from "node:path";
import url from "node:url";

import compression from "compression";
import express from "express";
import morgan from "morgan";

const ONE_PROXY_HOP = 1;

// React picks its production or development build when it is first loaded,
// so the default must be in place before anything imports it.
process.env.NODE_ENV ??= "production";

const { createRequestHandler } = await import("@react-router/express");

const buildPath = path.resolve(process.argv[2] ?? "build/server/index.js");
const build = await import(url.pathToFileURL(buildPath).href);
const assetsDirectory = path.resolve(build.assetsBuildDirectory);
const port = Number(process.env.PORT ?? 3000);

const app = express();

app.disable("x-powered-by");
// The edge proxy terminates TLS and forwards plain HTTP. Without this the app
// sees itself on http:// and React Router refuses every browser form
// submission, whose Origin header says https://.
app.set("trust proxy", ONE_PROXY_HOP);
app.use(compression());
app.use(
  path.posix.join(build.publicPath, "assets"),
  express.static(path.join(assetsDirectory, "assets"), {
    immutable: true,
    maxAge: "1y",
  }),
);
app.use(build.publicPath, express.static(assetsDirectory));
app.use(express.static("public", { maxAge: "1h" }));
app.use(morgan("tiny"));
app.all(
  "/{*splat}",
  createRequestHandler({ build, mode: process.env.NODE_ENV }),
);

const server = app.listen(port, (error) => {
  if (error) {
    throw error;
  }

  console.log(`[platform] http://localhost:${port}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    server.close((error) => {
      if (error) {
        console.error(error);
      }
    });
  });
}
