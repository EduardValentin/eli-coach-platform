export interface WaitlistMode {
  isEnabled(): Promise<boolean>;
}
