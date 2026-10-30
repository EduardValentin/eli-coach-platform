export interface PayloadDigestGeneratorPort {
  digest(canonicalPayload: string): string;
}
