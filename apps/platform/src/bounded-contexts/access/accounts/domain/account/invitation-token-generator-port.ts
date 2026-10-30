export interface InvitationTokenGeneratorPort {
  create(): { rawToken: string; sha256: string };
}
