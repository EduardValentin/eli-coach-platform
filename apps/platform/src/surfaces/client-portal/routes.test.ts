import type { RouteConfigEntry } from "@react-router/dev/routes";
import { describe, expect, it } from "vitest";

import { clientPortalRoutes } from "./routes";

const ACCESS_LAYOUT_FILE = /shell\/access-layout\.tsx$/;
const SHELL_LAYOUT_FILE = /shell\/layout\.tsx$/;
const ANONYMOUS_ROUTE_PATHS = [
  "client/manifest.webmanifest",
  "client/sw.js",
  "client/readyz",
];

function collectFiles(entries: readonly RouteConfigEntry[]): string[] {
  return entries.flatMap((entry) => [
    entry.file,
    ...collectFiles(entry.children ?? []),
  ]);
}

describe("client portal routes", () => {
  it("serves every page under the client prefix through the access layout", () => {
    // arrange
    const guardedEntries = clientPortalRoutes.filter(
      (entry) => !ANONYMOUS_ROUTE_PATHS.includes(entry.path ?? ""),
    );

    // act
    const guardedRoots = guardedEntries.map((entry) => entry.file);

    // assert
    expect(guardedRoots).toHaveLength(1);
    expect(guardedRoots[0]).toMatch(ACCESS_LAYOUT_FILE);
    expect(collectFiles(guardedEntries[0]?.children ?? [])).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/shell\/layout\.tsx$/),
        expect.stringMatching(/pages\/home\.tsx$/),
      ]),
    );
  });

  it("serves her profile inside the portal shell beside the dashboard", () => {
    // arrange
    const accessLayout = clientPortalRoutes.find((entry) =>
      ACCESS_LAYOUT_FILE.test(entry.file),
    );

    // act
    const shell = accessLayout?.children?.find((entry) =>
      SHELL_LAYOUT_FILE.test(entry.file),
    );

    // assert
    expect(shell?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: expect.stringMatching(/pages\/home\.tsx$/),
          index: true,
        }),
        expect.objectContaining({
          file: expect.stringMatching(
            /features\/client-profile\/ui\/client\/profile\/profile-page\.tsx$/,
          ),
          path: "client/profile",
        }),
      ]),
    );
  });

  it("serves her settings inside the portal shell", () => {
    // arrange
    const accessLayout = clientPortalRoutes.find((entry) =>
      ACCESS_LAYOUT_FILE.test(entry.file),
    );

    // act
    const shell = accessLayout?.children?.find((entry) =>
      SHELL_LAYOUT_FILE.test(entry.file),
    );

    // assert
    expect(shell?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: expect.stringMatching(
            /features\/coaching-sales\/ui\/client\/settings\/settings-page\.tsx$/,
          ),
          path: "client/settings",
        }),
      ]),
    );
  });

  it("serves her resources inside the portal shell", () => {
    // arrange
    const accessLayout = clientPortalRoutes.find((entry) =>
      ACCESS_LAYOUT_FILE.test(entry.file),
    );

    // act
    const shell = accessLayout?.children?.find((entry) =>
      SHELL_LAYOUT_FILE.test(entry.file),
    );

    // assert
    expect(shell?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: expect.stringMatching(
            /features\/client-resources\/ui\/client\/resources\/resources-page\.tsx$/,
          ),
          path: "client/resources",
        }),
      ]),
    );
  });

  it("serves the ended page behind the access layout but outside the portal shell", () => {
    // arrange
    const accessLayout = clientPortalRoutes.find((entry) =>
      ACCESS_LAYOUT_FILE.test(entry.file),
    );

    // act
    const besideShell = accessLayout?.children ?? [];

    // assert
    expect(besideShell).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: expect.stringMatching(
            /features\/coaching-sales\/ui\/client\/ended\/ended-page\.tsx$/,
          ),
          path: "client/ended",
        }),
      ]),
    );
  });

  it("leaves only the manifest, service worker and readiness routes outside it", () => {
    // arrange
    const routePaths = clientPortalRoutes.map((entry) => entry.path);

    // act
    const anonymousPaths = routePaths.filter((path) =>
      ANONYMOUS_ROUTE_PATHS.includes(path ?? ""),
    );

    // assert
    expect(anonymousPaths).toEqual(ANONYMOUS_ROUTE_PATHS);
    expect(clientPortalRoutes).toHaveLength(ANONYMOUS_ROUTE_PATHS.length + 1);
  });
});
