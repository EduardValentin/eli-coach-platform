export type StoreConsentVersions = {
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
};

export interface ConsentVersions {
  current(): StoreConsentVersions;
}
