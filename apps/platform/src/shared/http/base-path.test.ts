import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
});

describe("the prefix the server builds URLs under", () => {
  it("is the root until the instance registers one", async () => {
    // arrange
    const { appBasePath, appUrl } = await import("./base-path");

    // act
    const basePath = appBasePath();

    // assert
    expect(basePath).toBe("/");
    expect(appUrl("icon.svg")).toBe("/icon.svg");
  });

  it("is the prefix the instance registered, written without a trailing slash", async () => {
    // arrange
    const { appBasePath, appUrl, registerAppBasePath } =
      await import("./base-path");

    // act
    registerAppBasePath("/eli-coach-platform/");

    // assert
    expect(appBasePath()).toBe("/eli-coach-platform");
    expect(appUrl("/api/store/catalog")).toBe(
      "/eli-coach-platform/api/store/catalog",
    );
    expect(appUrl("icon.svg")).toBe("/eli-coach-platform/icon.svg");
  });

  it("is what the document hands the browser", async () => {
    // arrange
    const { appBasePathDocumentAttribute, registerAppBasePath } =
      await import("./base-path");

    // act
    registerAppBasePath("/eli-coach-platform");

    // assert
    expect(appBasePathDocumentAttribute()).toEqual({
      "data-app-base-path": "/eli-coach-platform",
    });
  });
});
