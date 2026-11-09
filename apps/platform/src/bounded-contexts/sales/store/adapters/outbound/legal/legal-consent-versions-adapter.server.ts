import type {
  ConsentVersionsPort,
  StoreConsentVersions,
} from "~/bounded-contexts/sales/store/domain/acquisition";
import {
  PAID_DIGITAL_DELIVERY_CONSENT,
  PRIVACY_POLICY_VERSION,
  STORE_MARKETING_CONSENT_VERSION,
  type TermsFacade,
} from "~/bounded-contexts/legal/public";

export class LegalConsentVersionsAdapter implements ConsentVersionsPort {
  constructor(private readonly termsFacade: TermsFacade) {}

  current(): StoreConsentVersions {
    return {
      marketingConsentVersion: STORE_MARKETING_CONSENT_VERSION,
      paidDeliveryConsentTermsVersion:
        PAID_DIGITAL_DELIVERY_CONSENT.termsVersion,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: this.termsFacade.currentTerms().version,
    };
  }
}
