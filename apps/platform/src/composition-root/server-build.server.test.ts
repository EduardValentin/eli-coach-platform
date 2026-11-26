import type { ServerBuild } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

const builtForTheRoot = {
  entry: {
    imports: ["/assets/react-Bq1.js"],
    module: "/assets/entry.client-Ab1.js",
  },
  routes: {
    root: {
      clientActionModule: undefined,
      clientLoaderModule: "/assets/root-client-loader-Cd2.js",
      clientMiddlewareModule: undefined,
      css: ["/assets/root-Ef3.css", "/assets/lazy-Gh4.css#"],
      hasAction: false,
      hasClientAction: false,
      hasClientLoader: true,
      hasClientMiddleware: false,
      hasErrorBoundary: true,
      hasLoader: true,
      hydrateFallbackModule: undefined,
      id: "root",
      imports: ["/assets/jsx-runtime-Ij5.js"],
      module: "/assets/root-Kl6.js",
      path: "",
    },
  },
  url: "/assets/manifest-0a1b2c3d.js",
  version: "0a1b2c3d",
} satisfies ServerBuild["assets"];

vi.mock("virtual:react-router/server-build", () => ({
  assets: builtForTheRoot,
  assetsBuildDirectory: "build/client",
  basename: "/",
  publicPath: "/",
  ssr: true,
}));

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("~/composition-root/runtime-environment");
});

describe("the server build served under the prefix the instance starts with", () => {
  it("moves the router, the static files and every built asset URL under the prefix", async () => {
    // arrange
    instanceStartsUnder("/eli-coach-platform");

    // act
    const served = await import("./server-build.server");

    // assert
    expect(served.basename).toBe("/eli-coach-platform");
    expect(served.publicPath).toBe("/eli-coach-platform/");
    expect(served.assets).toEqual({
      ...builtForTheRoot,
      entry: {
        imports: ["/eli-coach-platform/assets/react-Bq1.js"],
        module: "/eli-coach-platform/assets/entry.client-Ab1.js",
      },
      routes: {
        root: {
          ...builtForTheRoot.routes.root,
          clientLoaderModule:
            "/eli-coach-platform/assets/root-client-loader-Cd2.js",
          css: [
            "/eli-coach-platform/assets/root-Ef3.css",
            "/eli-coach-platform/assets/lazy-Gh4.css#",
          ],
          imports: ["/eli-coach-platform/assets/jsx-runtime-Ij5.js"],
          module: "/eli-coach-platform/assets/root-Kl6.js",
        },
      },
      url: "/eli-coach-platform/assets/manifest-0a1b2c3d.js",
    });
  });

  it("accepts the prefix written with a trailing slash", async () => {
    // arrange
    instanceStartsUnder("/eli-coach-platform/");

    // act
    const served = await import("./server-build.server");

    // assert
    expect(served.basename).toBe("/eli-coach-platform");
    expect(served.publicPath).toBe("/eli-coach-platform/");
    expect(served.assets.entry.module).toBe(
      "/eli-coach-platform/assets/entry.client-Ab1.js",
    );
  });

  it("serves the build unchanged at the root", async () => {
    // arrange
    instanceStartsUnder("/");

    // act
    const served = await import("./server-build.server");

    // assert
    expect(served.basename).toBe("/");
    expect(served.publicPath).toBe("/");
    expect(served.assets).toEqual(builtForTheRoot);
  });

  it("keeps the fields it does not serve differently", async () => {
    // arrange
    instanceStartsUnder("/eli-coach-platform");

    // act
    const served = await import("./server-build.server");

    // assert
    expect(served.ssr).toBe(true);
    expect(served.assetsBuildDirectory).toBe("build/client");
  });

  it("hands the prefix to the code that builds links", async () => {
    // arrange
    instanceStartsUnder("/eli-coach-platform");

    // act
    await import("./server-build.server");

    // assert
    const { appUrl } = await import("~/shared/http/base-path");
    expect(appUrl("/store")).toBe("/eli-coach-platform/store");
  });
});

function instanceStartsUnder(appBasePath: string): void {
  vi.doMock("~/composition-root/runtime-environment", () => ({
    getRuntimeEnvironment: () => ({ APP_BASE_PATH: appBasePath }),
  }));
}
