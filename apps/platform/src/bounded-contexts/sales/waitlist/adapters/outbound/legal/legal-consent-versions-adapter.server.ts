import type {
  ConsentVersionsPort,
  WaitlistConsentVersions,
} from "~/bounded-contexts/sales/waitlist/domain/waitlist";
import {
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
} from "~/bounded-contexts/legal/public";

export class LegalConsentVersionsAdapter implements ConsentVersionsPort {
  current(): WaitlistConsentVersions {
    return {
      marketingConsentVersion: WAITLIST_MARKETING_CONSENT_VERSION,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    };
  }
}
