export type DeliveryConsentSnapshot = {
  termsVersion: string;
  consentedAt: Date;
};

export class DeliveryConsent {
  readonly termsVersion: string;
  readonly consentedAt: Date;

  private constructor(snapshot: DeliveryConsentSnapshot) {
    this.termsVersion = snapshot.termsVersion;
    this.consentedAt = snapshot.consentedAt;
  }

  static given(snapshot: DeliveryConsentSnapshot): DeliveryConsent {
    return new DeliveryConsent(snapshot);
  }

  static reconstitute(snapshot: DeliveryConsentSnapshot): DeliveryConsent {
    return new DeliveryConsent(snapshot);
  }

  toSnapshot(): DeliveryConsentSnapshot {
    return { termsVersion: this.termsVersion, consentedAt: this.consentedAt };
  }
}
