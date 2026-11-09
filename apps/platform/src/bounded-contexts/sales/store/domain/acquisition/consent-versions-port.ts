export type StoreConsentVersions = {
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
  paidDeliveryConsentTermsVersion: string;
};

export interface ConsentVersionsPort {
  current(): StoreConsentVersions;
}
