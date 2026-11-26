import type { RouteConfigEntry } from "@react-router/dev/routes";
import { describe, expect, it, vi } from "vitest";

import routes from "~/routes";

import { ComingSoonGate } from "./coming-soon-gate.server";

type RegisteredRoute = { file: string; pattern: string };

function flatten(
  entries: readonly RouteConfigEntry[],
  parentPattern = "",
): RegisteredRoute[] {
  return entries.flatMap((entry) => {
    const own = entry.path ? `${parentPattern}/${entry.path}` : parentPattern;
    const here = entry.file ? [{ file: entry.file, pattern: own || "/" }] : [];

    return [...here, ...flatten(entry.children ?? [], own)];
  });
}

const resourceRoutes = flatten(routes).filter(({ file }) =>
  file.endsWith(".ts"),
);

describe("the route table under coming-soon mode", () => {
  it("registers resource routes to check", () => {
    // arrange, act, assert
    expect(resourceRoutes.length).toBeGreaterThan(10);
  });

  it.each(resourceRoutes)(
    "never hands the placeholder to the resource route $pattern",
    ({ pattern }) => {
      // arrange
      const next = vi.fn().mockResolvedValue(new Response());
      const request = {
        pattern,
        request: new Request("http://localhost/x"),
      } as never;

      // act
      const act = () => new ComingSoonGate("on").blockUnlessOpen(request, next);

      // assert
      expect(act).not.toThrow();
    },
  );
});
