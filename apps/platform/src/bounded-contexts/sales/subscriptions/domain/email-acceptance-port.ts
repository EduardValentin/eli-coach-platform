export interface EmailAcceptancePort {
  normalize(raw: string): string;
  accepts(email: string): boolean;
}
