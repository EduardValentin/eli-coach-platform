export interface EmailAcceptance {
  normalize(raw: string): string;
  accepts(email: string): boolean;
}
