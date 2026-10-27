import { AsyncLocalStorage } from "node:async_hooks";

import type { FeatureFlagSet } from "@eli-coach-platform/domain/feature-flag";

const requestOverrides = new AsyncLocalStorage<Readonly<FeatureFlagSet>>();

export function runWithFeatureFlagOverrides<T>(
  overrides: Readonly<FeatureFlagSet>,
  run: () => T,
): T {
  return requestOverrides.run(overrides, run);
}

export function currentFeatureFlagOverrides(): Readonly<FeatureFlagSet> {
  return requestOverrides.getStore() ?? {};
}
