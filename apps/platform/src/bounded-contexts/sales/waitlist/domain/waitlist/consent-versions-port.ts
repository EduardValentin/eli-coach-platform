import type { WaitlistConsentVersions } from "./waitlist";

export interface ConsentVersionsPort {
  current(): WaitlistConsentVersions;
}
