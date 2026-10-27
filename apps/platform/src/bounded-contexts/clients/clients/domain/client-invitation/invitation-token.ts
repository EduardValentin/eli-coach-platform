export interface InvitationTokenGenerator {
  create(): { rawToken: string; sha256: string };
}

export interface InvitationTokenHasher {
  sha256(rawToken: string): string;
}
