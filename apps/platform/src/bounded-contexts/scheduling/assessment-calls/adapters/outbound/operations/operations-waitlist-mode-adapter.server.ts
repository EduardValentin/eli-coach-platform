import type { WaitlistModePort } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import { WAITLIST_MODE_FEATURE_FLAG } from "~/bounded-contexts/operations/public/feature-flags";
import { type FeatureFlagsFacade } from "~/bounded-contexts/operations/public/feature-flags-facade";

export class OperationsWaitlistModeAdapter implements WaitlistModePort {
  constructor(private readonly featureFlagsFacade: FeatureFlagsFacade) {}

  isEnabled(): Promise<boolean> {
    return this.featureFlagsFacade.isOn(WAITLIST_MODE_FEATURE_FLAG);
  }
}
