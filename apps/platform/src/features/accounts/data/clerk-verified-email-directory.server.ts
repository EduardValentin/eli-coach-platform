import { clerkClient } from "@clerk/react-router/server";
import type { VerifiedEmailDirectory } from "@eli-coach-platform/domain";

const VERIFIED_STATUS = "verified";

// Clerk's `ClerkClient` exposes `users` as a class instance with private
// fields, so a `Pick` of it can never be satisfied by a plain test stub —
// only the one call this adapter makes is structurally typed here. The real
// client satisfies it; `EmailAddress` and `Verification` carry more than
// this, which is exactly what a narrow dependency declaration should ignore.
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

// `DataFunctionArgs`, the argument `clerkClient` takes, is not exported by
// `@clerk/react-router`, so it is named through the function itself.
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
 * Built per request rather than once at composition, because `clerkClient`
 * resolves the Backend API it talks to from the request being served —
 * `CLERK_API_URL` included. A client constructed from the environment alone
 * would ignore that variable and reach the real Clerk from every environment
 * that redirects it, the integration suite included.
 */
export function createClerkVerifiedEmailDirectory(
  args: ClerkRequestArgs,
): VerifiedEmailDirectory {
  return new ClerkVerifiedEmailDirectory(clerkClient(args));
}
