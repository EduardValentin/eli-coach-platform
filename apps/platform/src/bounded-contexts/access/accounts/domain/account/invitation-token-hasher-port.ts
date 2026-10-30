export interface InvitationTokenHasherPort {
  sha256(rawToken: string): string;
}
