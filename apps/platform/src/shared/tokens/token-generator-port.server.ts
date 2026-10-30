export type TokenGeneratorPort = {
  create(): { rawToken: string; sha256: string };
};
