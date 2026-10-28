import type {
  ConsentVersions,
  WaitlistConsentVersions,
} from "~/bounded-contexts/sales/waitlist/domain/waitlist";
import {
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
} from "~/bounded-contexts/legal/public";

export class LegalConsentVersions implements ConsentVersions {
  current(): WaitlistConsentVersions {
    return {
      marketingConsentVersion: WAITLIST_MARKETING_CONSENT_VERSION,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    };
  }
}
