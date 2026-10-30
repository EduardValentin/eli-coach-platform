import type { FeatureFlagReaderPort } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import type { FeatureFlagsFacade } from "~/bounded-contexts/operations/public/feature-flags-facade";

export class FeatureFlagsFacadeAdapter implements FeatureFlagsFacade {
  constructor(private readonly featureFlagReaderPort: FeatureFlagReaderPort) {}

  async isOn(flag: string) {
    return (await this.featureFlagReaderPort.execute())[flag] === true;
  }
}
