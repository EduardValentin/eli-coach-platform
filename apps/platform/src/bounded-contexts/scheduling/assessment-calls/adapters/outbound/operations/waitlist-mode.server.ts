import type { WaitlistMode } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import {
  WAITLIST_MODE_FEATURE_FLAG,
  type FeatureFlagsFacade,
} from "~/bounded-contexts/operations/public/feature-flags";

export class OperationsWaitlistMode implements WaitlistMode {
  constructor(private readonly featureFlags: FeatureFlagsFacade) {}

  isEnabled(): Promise<boolean> {
    return this.featureFlags.isOn(WAITLIST_MODE_FEATURE_FLAG);
  }
}
