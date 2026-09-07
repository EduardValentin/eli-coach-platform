import { clerkClient } from "@clerk/react-router/server";
import type { VerifiedEmailDirectory } from "@eli-coach-platform/domain";

const VERIFIED_STATUS = "verified";

// `ClerkClient.users` is a class instance with private fields, so a `Pick` of
// it cannot be satisfied by a stub — only the one call made here is typed.
type ClerkUserDirectory = {
  users: {
    getUser(userId: string): Promise<{
      emailAddresses: readonly {
        emailAddress: string;
        verification: { status: string } | null;
      }[];
    }>;
  };
};

// `@clerk/react-router` does not export this argument type.
type ClerkRequestArgs = Parameters<typeof clerkClient>[0];

export class ClerkVerifiedEmailDirectory implements VerifiedEmailDirectory {
  constructor(private readonly client: ClerkUserDirectory) {}

  async listVerifiedEmails(
    authSubjectId: string,
  ): Promise<readonly string[]> {
    const user = await this.client.users.getUser(authSubjectId);

    return user.emailAddresses
      .filter((address) => address.verification?.status === VERIFIED_STATUS)
      .map((address) => address.emailAddress);
  }
}

/**
 * Built per request: `clerkClient` resolves the Backend API from the request,
 * `CLERK_API_URL` included. A client built from the environment alone ignores
 * it and reaches the real Clerk — the integration suite included.
 */
export function createClerkVerifiedEmailDirectory(
  args: ClerkRequestArgs,
): VerifiedEmailDirectory {
  return new ClerkVerifiedEmailDirectory(clerkClient(args));
}
