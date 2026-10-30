import type { FeatureFlagReaderPort } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";

import { currentFeatureFlagOverrides } from "./feature-flag-override-store.server";

export class FeatureFlagOverrideReaderAdapter implements FeatureFlagReaderPort {
  constructor(private readonly storedFlags: FeatureFlagReaderPort) {}

  async execute() {
    return {
      ...(await this.storedFlags.execute()),
      ...currentFeatureFlagOverrides(),
    };
  }
}
