import type { WaitlistConsentVersions } from "./waitlist";

export interface ConsentVersions {
  current(): WaitlistConsentVersions;
}
