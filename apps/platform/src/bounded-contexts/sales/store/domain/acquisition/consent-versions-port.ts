export type StoreConsentVersions = {
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
};

export interface ConsentVersionsPort {
  current(): StoreConsentVersions;
}
