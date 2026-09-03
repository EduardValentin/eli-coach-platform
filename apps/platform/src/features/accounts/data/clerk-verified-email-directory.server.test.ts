import { describe, expect, it, vi } from "vitest";

import { ClerkVerifiedEmailDirectory } from "./clerk-verified-email-directory.server";

const AUTH_SUBJECT_ID = "user_2aBcDeFgHiJkLmNoPqRsTuVwXyZ";

function buildDirectory(
  emailAddresses: readonly {
    emailAddress: string;
    verification: { status: string } | null;
  }[],
): ClerkVerifiedEmailDirectory {
  return new ClerkVerifiedEmailDirectory({
    users: { getUser: vi.fn().mockResolvedValue({ emailAddresses }) },
  });
}

describe("ClerkVerifiedEmailDirectory", () => {
  it("answers with every address the provider has verified", async () => {
    // arrange
    const directory = buildDirectory([
      {
        emailAddress: "woman@example.com",
        verification: { status: "verified" },
      },
      {
        emailAddress: "second@example.com",
        verification: { status: "verified" },
      },
    ]);

    // act
    const verifiedEmails =
      await directory.listVerifiedEmails(AUTH_SUBJECT_ID);

    // assert
    expect(verifiedEmails).toEqual([
      "woman@example.com",
      "second@example.com",
    ]);
  });

  it("withholds an address the provider has not verified", async () => {
    // arrange
    const directory = buildDirectory([
      {
        emailAddress: "woman@example.com",
        verification: { status: "verified" },
      },
      {
        emailAddress: "unproven@example.com",
        verification: { status: "unverified" },
      },
      { emailAddress: "unattempted@example.com", verification: null },
    ]);

    // act
    const verifiedEmails =
      await directory.listVerifiedEmails(AUTH_SUBJECT_ID);

    // assert
    expect(verifiedEmails).toEqual(["woman@example.com"]);
  });

  it("answers with nothing for an identity carrying no address at all", async () => {
    // arrange
    const directory = buildDirectory([]);

    // act
    const verifiedEmails =
      await directory.listVerifiedEmails(AUTH_SUBJECT_ID);

    // assert
    expect(verifiedEmails).toEqual([]);
  });

  it("asks the provider for the auth subject it was given", async () => {
    // arrange
    const getUser = vi.fn().mockResolvedValue({ emailAddresses: [] });
    const directory = new ClerkVerifiedEmailDirectory({ users: { getUser } });

    // act
    await directory.listVerifiedEmails(AUTH_SUBJECT_ID);

    // assert
    expect(getUser).toHaveBeenCalledWith(AUTH_SUBJECT_ID);
  });
});
