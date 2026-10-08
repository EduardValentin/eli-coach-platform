import type { ClientIdentity } from "~/features/coaching-sales/public/client-journey";

export type ClientShellPresentation = {
  displayName: string;
  greeting: string;
};

const UNNAMED_CLIENT_PRESENTATION: ClientShellPresentation = {
  displayName: "Client",
  greeting: "Welcome back.",
};

export function presentClientIdentity(
  identity: ClientIdentity | null,
): ClientShellPresentation {
  if (!identity) {
    return UNNAMED_CLIENT_PRESENTATION;
  }

  return {
    displayName: [identity.firstName, identity.lastName]
      .filter((name) => name.length > 0)
      .join(" "),
    greeting: `Welcome back, ${identity.firstName}.`,
  };
}
