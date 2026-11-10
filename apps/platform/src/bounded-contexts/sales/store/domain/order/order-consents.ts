import type { StoreConsentVersions } from "../acquisition";

export type OrderConsentsSnapshot = {
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
  marketingConsent: boolean;
  marketingConsentedAt: Date | null;
};

type GivenOrderConsents = {
  versions: StoreConsentVersions;
  marketingConsent: boolean;
  at: Date;
};

export class OrderConsents {
  readonly termsVersion: string;
  readonly privacyPolicyVersion: string;
  readonly marketingConsentVersion: string;
  readonly marketingConsent: boolean;
  readonly marketingConsentedAt: Date | null;

  private constructor(snapshot: OrderConsentsSnapshot) {
    this.termsVersion = snapshot.termsVersion;
    this.privacyPolicyVersion = snapshot.privacyPolicyVersion;
    this.marketingConsentVersion = snapshot.marketingConsentVersion;
    this.marketingConsent = snapshot.marketingConsent;
    this.marketingConsentedAt = snapshot.marketingConsentedAt;
  }

  static given(consents: GivenOrderConsents): OrderConsents {
    return new OrderConsents({
      termsVersion: consents.versions.termsVersion,
      privacyPolicyVersion: consents.versions.privacyPolicyVersion,
      marketingConsentVersion: consents.versions.marketingConsentVersion,
      marketingConsent: consents.marketingConsent,
      marketingConsentedAt: consents.marketingConsent ? consents.at : null,
    });
  }

  static reconstitute(snapshot: OrderConsentsSnapshot): OrderConsents {
    return new OrderConsents(snapshot);
  }

  toSnapshot(): OrderConsentsSnapshot {
    return {
      termsVersion: this.termsVersion,
      privacyPolicyVersion: this.privacyPolicyVersion,
      marketingConsentVersion: this.marketingConsentVersion,
      marketingConsent: this.marketingConsent,
      marketingConsentedAt: this.marketingConsentedAt,
    };
  }
}
